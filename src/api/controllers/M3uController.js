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
    logger.info('Fetching M3U from provider', { url: url.substring(0, 80) });
    
    try {
      // SIMPLE request - as it was originally working
      const response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 5,
        responseType: 'text'
      });
      
      const duration = Date.now() - startTime;
      
      logger.info('M3U fetched successfully', { 
        status: response.status,
        contentLength: response.data?.length,
        duration
      });
      
      // Check for empty content
      if (!response.data || response.data.trim().length === 0) {
        throw new Error('Provider returned empty playlist');
      }
      
      return response.data;
    } catch (error) {
      logger.error('M3U fetch error', { 
        error: error.message,
        code: error.code,
        responseStatus: error.response?.status
      });
      throw error;
    }
  }

  /**
   * GET /m3u/:code.m3u - Main M3U playlist endpoint
   */
  proxyM3u = asyncHandler(async (req, res) => {
    const { code } = req.params;

    // Get user's M3U URL
    let m3uUrl;
    try {
      const result = await this._getUserM3U.execute({ code });
      m3uUrl = result.url;
      
      if (!m3uUrl) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'No M3U URL assigned'
        });
      }
      
      this._userM3uUrls.set(code, m3uUrl);
    } catch (error) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message
      });
    }

    // Check cache
    const cacheKey = `m3u:content:${code}`;
    let m3uContent = await this._cacheService.get(cacheKey);

    if (!m3uContent) {
      try {
        m3uContent = await this._circuitBreaker.fire(m3uUrl);
        await this._cacheService.set(cacheKey, m3uContent, 300);
      } catch (error) {
        logger.error('M3U fetch failed', { error: error.message });
        return res.status(502).json({
          error: 'Bad Gateway',
          message: error.message
        });
      }
    }

    res.set({
      'Content-Type': 'application/x-mpegURL',
      'Cache-Control': 'private, max-age=300'
    });

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
    
    try {
      const response = await axios.get(testUrl, {
        timeout: 10000,
        maxRedirects: 5,
        responseType: 'text'
      });
      
      res.json({
        status: 'success',
        data: {
          url: testUrl,
          status: response.status,
          contentLength: response.data?.length
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
}

module.exports = M3uController;
