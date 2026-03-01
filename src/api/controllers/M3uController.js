/**
 * M3U Proxy Controller
 * 
 * Handles M3U playlist proxying and TS segment streaming
 * 
 * CRITICAL: This is a HOT PATH - performance is critical
 */

const axios = require('axios');
const CircuitBreaker = require('opossum');
const logger = require('../../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

class M3uController {
  constructor(getUserM3U, cacheService) {
    this._getUserM3U = getUserM3U;
    this._cacheService = cacheService;
    
    // Store for user M3U URLs (to rewrite TS segments)
    this._userM3uUrls = new Map();
    
    // Initialize circuit breaker for external M3U fetching
    this._circuitBreaker = new CircuitBreaker(this._fetchM3u.bind(this), {
      timeout: parseInt(process.env.PROXY_TIMEOUT_MS) || 30000,
      errorThresholdPercentage: 50,
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'm3u-fetcher'
    });

    this._setupCircuitBreakerEvents();
  }

  _setupCircuitBreakerEvents() {
    this._circuitBreaker.on('open', () => {
      logger.error('M3U Circuit Breaker OPENED - M3U provider unavailable');
    });

    this._circuitBreaker.on('halfOpen', () => {
      logger.warn('M3U Circuit Breaker HALF-OPEN - testing provider');
    });

    this._circuitBreaker.on('close', () => {
      logger.info('M3U Circuit Breaker CLOSED - provider recovered');
    });
  }

  async _fetchM3u(url) {
    const response = await axios.get(url, {
      timeout: parseInt(process.env.PROXY_TIMEOUT_MS) || 30000,
      maxRedirects: parseInt(process.env.PROXY_MAX_REDIRECTS) || 5,
      responseType: 'text',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': '*/*'
      },
      validateStatus: (status) => status === 200
    });
    return response.data;
  }

  /**
   * Rewrite M3U content to proxy TS segments through our server
   * This solves CORS issues in browsers
   */
  _rewriteM3uContent(content, code, baseUrl) {
    const lines = content.split('\n');
    const rewritten = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // If line is a URL (starts with http)
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Encode the original URL and proxy it
        const originalUrl = encodeURIComponent(trimmed);
        const proxyUrl = `${baseUrl}/api/v1/stream/${code}?url=${originalUrl}`;
        rewritten.push(proxyUrl);
      } else {
        rewritten.push(line);
      }
    }
    
    return rewritten.join('\n');
  }

  /**
   * GET /m3u/:code.m3u - Main M3U playlist endpoint
   */
  proxyM3u = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { code } = req.params;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    logger.debug('M3U proxy request', { codeMasked: code.substring(0, 4) + '****' });

    // Get user's M3U URL
    let m3uUrl;
    try {
      const result = await this._getUserM3U.execute({ code });
      m3uUrl = result.url;
      // Store for TS segment proxying
      this._userM3uUrls.set(code, m3uUrl);
    } catch (error) {
      logger.warn('M3U access denied', { error: error.message });
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
        code: 'M3U_ACCESS_DENIED'
      });
    }

    // Check cache (300s = 5 dakika - frontend ile senkronize)
    const cacheKey = `m3u:content:${code}`;
    let m3uContent = await this._cacheService.get(cacheKey);
    let cacheHit = !!m3uContent;

    if (!m3uContent) {
      try {
        m3uContent = await this._circuitBreaker.fire(m3uUrl);
        // 5 dakika cache - M3U içeriği genelde sabit
        await this._cacheService.set(cacheKey, m3uContent, 300);
      } catch (error) {
        logger.error('M3U fetch failed', { error: error.message });
        return res.status(502).json({
          error: 'Bad Gateway',
          message: 'Failed to fetch M3U from provider',
          code: 'M3U_FETCH_ERROR'
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.info('M3U served', { 
      codeMasked: code.substring(0, 4) + '****', 
      duration,
      cache: cacheHit ? 'HIT' : 'MISS'
    });

    res.set({
      'Content-Type': 'application/x-mpegURL',
      // Browser cache: 5 dakika (frontend session cache ile uyumlu)
      'Cache-Control': 'private, max-age=300',
      'X-Cache': cacheHit ? 'HIT' : 'MISS',
      'X-Response-Time': `${duration}ms`
    });

    res.send(m3uContent);
  });

  /**
   * GET /stream/:code - Proxy TS segments (CORS bypass)
   */
  proxyStream = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const originalUrl = decodeURIComponent(req.query.url);

    if (!originalUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    // Validate URL belongs to allowed domain
    const allowedDomains = ['sifiriptvdns.com'];
    const urlObj = new URL(originalUrl);
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    try {
      // First, resolve any redirects
      const headResponse = await axios({
        method: 'head',
        url: originalUrl,
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18'
        }
      });
      
      const finalUrl = headResponse.request.res.responseUrl || originalUrl;
      
      // Now stream from final URL
      const response = await axios({
        method: 'get',
        url: finalUrl,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*'
        }
      });

      // Set CORS headers
      res.set({
        'Content-Type': response.headers['content-type'] || 'video/MP2T',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=10'
      });

      response.data.pipe(res);
    } catch (error) {
      logger.error('Stream proxy error', { error: error.message, url: originalUrl });
      res.status(502).json({ error: 'Stream fetch failed: ' + error.message });
    }
  });

  healthCheck = asyncHandler(async (req, res) => {
    res.json({
      status: 'success',
      data: {
        circuitBreaker: {
          state: this._circuitBreaker.opened ? 'OPEN' : 'CLOSED'
        }
      }
    });
  });
}

module.exports = M3uController;
