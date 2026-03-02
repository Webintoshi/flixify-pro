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
    const startTime = Date.now();
    
    // Use Turkey proxy to bypass IP restrictions
    const PROXY_URL = 'http://5.175.136.42:3000/';
    const proxyTargetUrl = PROXY_URL + encodeURIComponent(url);
    
    logger.info('Fetching M3U via Turkey proxy', { 
      originalUrl: url.substring(0, 80),
      proxyUrl: proxyTargetUrl,
      proxyHost: '5.175.136.42',
      proxyPort: 3000
    });
    
    try {
      const response = await axios.get(proxyTargetUrl, {
        timeout: 60000,
        responseType: 'text',
        validateStatus: () => true // Accept any status to see what proxy returns
      });
      
      const duration = Date.now() - startTime;
      
      logger.info('Proxy response received', { 
        status: response.status,
        statusText: response.statusText,
        contentLength: response.data?.length,
        dataPreview: response.data?.substring(0, 200),
        duration
      });
      
      // Check if proxy returned error
      if (response.status >= 400) {
        throw new Error(`Proxy returned HTTP ${response.status}: ${response.data}`);
      }
      
      // Check for empty content
      if (!response.data || response.data.trim().length === 0) {
        throw new Error('Provider returned empty playlist');
      }
      
      return response.data;
    } catch (error) {
      logger.error('M3U fetch error via proxy', { 
        error: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        proxyUrl: proxyTargetUrl
      });
      throw error;
    }
  }

  /**
   * GET /m3u/:code.m3u - Main M3U playlist endpoint
   */
  proxyM3u = asyncHandler(async (req, res) => {
    const { code } = req.params;
    
    logger.info('M3U proxy request START', { code, hasToken: !!req.headers.authorization });

    // Get user's M3U URL
    let m3uUrl;
    try {
      logger.info('Getting user M3U URL', { code });
      const result = await this._getUserM3U.execute({ code });
      m3uUrl = result.url;
      logger.info('User M3U URL retrieved', { code, url: m3uUrl ? m3uUrl.substring(0, 60) : 'null' });
      
      if (!m3uUrl) {
        logger.error('No M3U URL assigned', { code });
        return res.status(404).json({
          error: 'Not Found',
          message: 'No M3U URL assigned'
        });
      }
      
      this._userM3uUrls.set(code, m3uUrl);
    } catch (error) {
      logger.error('GetUserM3U failed', { code, error: error.message });
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    // Check cache
    const cacheKey = `m3u:content:${code}`;
    let m3uContent = await this._cacheService.get(cacheKey);
    logger.info('Cache check', { code, cacheHit: !!m3uContent });

    if (!m3uContent) {
      logger.info('Fetching from provider', { code, url: m3uUrl.substring(0, 60), cbState: this._circuitBreaker.opened ? 'OPEN' : 'CLOSED' });
      try {
        // Direct fetch without circuit breaker
        m3uContent = await this._fetchM3u(m3uUrl);
        logger.info('Provider fetch SUCCESS', { code, contentLength: m3uContent?.length });
        await this._cacheService.set(cacheKey, m3uContent, 300);
      } catch (error) {
        logger.error('M3U fetch FAILED', { 
          code, 
          error: error.message,
          errorCode: error.code,
          responseStatus: error.response?.status,
          responseData: error.response?.data?.substring?.(0, 200)
        });
        return res.status(502).json({
          error: 'Bad Gateway',
          message: error.message,
          details: error.response?.status ? `HTTP ${error.response.status}` : 'Unknown error'
        });
      }
    }

    res.set({
      'Content-Type': 'application/x-mpegURL',
      'Cache-Control': 'private, max-age=300'
    });

    logger.info('M3U proxy SUCCESS', { code, contentLength: m3uContent?.length });
    res.send(m3uContent);
  });

  /**
   * GET /stream/:code - Proxy TS segments
   */
  proxyStream = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const originalUrl = decodeURIComponent(req.query.url);

    if (!originalUrl) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    try {
      const response = await axios({
        method: 'get',
        url: originalUrl,
        responseType: 'stream',
        timeout: 30000
      });

      res.set({
        'Content-Type': response.headers['content-type'] || 'video/MP2T',
        'Access-Control-Allow-Origin': '*'
      });

      response.data.pipe(res);
    } catch (error) {
      logger.error('Stream proxy error', { error: error.message });
      res.status(502).json({ error: 'Stream fetch failed' });
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

  testProvider = asyncHandler(async (req, res) => {
    const testUrl = req.query.url || 'http://example.com/playlist.m3u';
    
    // Test via Turkey proxy
    const PROXY_URL = 'http://5.175.136.42:3000/';
    const proxyTargetUrl = PROXY_URL + encodeURIComponent(testUrl);
    
    logger.info('Testing provider via Turkey proxy', { originalUrl: testUrl, proxyUrl: proxyTargetUrl });
    
    try {
      const response = await axios.get(proxyTargetUrl, {
        timeout: 30000,
        responseType: 'text',
        validateStatus: () => true
      });
      
      res.json({
        status: response.status >= 400 ? 'error' : 'success',
        data: {
          url: testUrl,
          proxyUrl: proxyTargetUrl,
          proxyHost: '5.175.136.42',
          proxyPort: 3000,
          status: response.status,
          contentLength: response.data?.length,
          preview: response.data?.substring(0, 500)
        }
      });
    } catch (error) {
      res.json({
        status: 'error',
        data: {
          url: testUrl,
          error: error.message,
          responseStatus: error.response?.status
        }
      });
    }
  });

  /**
   * POST /m3u/reset-circuit-breaker - Reset circuit breaker
   */
  resetCircuitBreaker = asyncHandler(async (req, res) => {
    const wasOpen = this._circuitBreaker.opened;
    this._circuitBreaker.close();
    logger.info('Circuit breaker reset', { wasOpen });
    res.json({ status: 'success', message: 'Circuit breaker reset' });
  });

  /**
   * POST /m3u/clear-cache - Clear M3U cache
   */
  clearCache = asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'User code required' });
    }
    
    const cacheKey = `m3u:content:${code}`;
    await this._cacheService.del(cacheKey);
    
    logger.info('M3U cache cleared', { code });
    res.json({ status: 'success', message: 'Cache cleared' });
  });
}

module.exports = M3uController;
