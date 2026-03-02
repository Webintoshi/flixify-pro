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
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 15000, // 15s (was 30s)
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      name: 'm3u-fetcher'
    });

    this._setupCircuitBreakerEvents();
    
    // Auto-reset circuit breaker periodically to prevent stuck open state
    this._startHealthCheck();
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

  /**
   * Start periodic health check to auto-reset circuit breaker if needed
   */
  _startHealthCheck() {
    // Check every 60 seconds if circuit breaker is open and try to close it
    setInterval(() => {
      if (this._circuitBreaker.opened) {
        logger.info('Auto-attempting to close circuit breaker during health check');
        this._circuitBreaker.close();
      }
    }, 60000);
  }

  async _fetchM3u(url) {
    const startTime = Date.now();
    logger.debug('Fetching M3U from provider', { url: url.substring(0, 50) + '...' });
    
    try {
      logger.debug('Starting axios request', { 
        url: url.substring(0, 60) + '...',
        timeout: parseInt(process.env.PROXY_TIMEOUT_MS) || 30000,
        maxRedirects: parseInt(process.env.PROXY_MAX_REDIRECTS) || 5
      });
      
      // Request with browser-like headers - handle both old and new provider formats
      logger.info('Making request to new provider', { url: url.substring(0, 80) });
      
      const response = await axios.get(url, {
        timeout: 30000,
        maxRedirects: 10,
        responseType: 'text',
        validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx - reject only 5xx
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive'
        }
      });
      
      const duration = Date.now() - startTime;
      
      logger.info('Provider response received', { 
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        dataLength: response.data?.length,
        dataPreview: response.data?.substring(0, 100)
      });
      
      // Check for HTTP error status (4xx)
      if (response.status >= 400) {
        logger.error('Provider returned error status', {
          status: response.status,
          statusText: response.statusText,
          url: url.substring(0, 80)
        });
        throw new Error(`Provider returned HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check for empty content
      if (!response.data || response.data.trim().length === 0) {
        logger.error('M3U provider returned empty playlist', { 
          url: url.substring(0, 50) + '...',
          status: response.status,
          contentLength: response.headers['content-length']
        });
        throw new Error('Provider returned empty playlist - account may be expired or inactive');
      }
      
      logger.info('M3U fetched successfully from provider', { 
        duration,
        contentLength: response.data?.length,
        url: url.substring(0, 50) + '...'
      });
      
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Detailed error logging
      if (error.code === 'ECONNABORTED') {
        logger.error('M3U fetch timeout', { 
          url: url.substring(0, 50) + '...',
          timeout: process.env.PROXY_TIMEOUT_MS || 30000,
          duration
        });
        throw new Error(`Timeout after ${duration}ms`);
      }
      
      if (error.code === 'ENOTFOUND') {
        logger.error('M3U provider DNS lookup failed', { 
          url: url.substring(0, 50) + '...',
          hostname: error.hostname
        });
        throw new Error('Provider DNS lookup failed');
      }
      
      if (error.response) {
        logger.error('M3U provider returned error', { 
          url: url.substring(0, 80) + '...',
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data?.substring?.(0, 200)
        });
        throw new Error(`Provider returned HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      
      logger.error('M3U fetch failed', { 
        url: url.substring(0, 50) + '...',
        error: error.message,
        code: error.code,
        duration
      });
      
      throw error;
    }
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
      logger.info('M3U proxy request received', { code: code });
      const result = await this._getUserM3U.execute({ code });
      m3uUrl = result.url;
      
      // CRITICAL: Log full URL for debugging 404 errors
      logger.info('User M3U URL retrieved', { 
        code: code,
        url: m3uUrl || 'NULL',
        urlLength: m3uUrl ? m3uUrl.length : 0,
        expiresAt: result.expiresAt
      });
      
      if (!m3uUrl) {
        logger.warn('User has no M3U URL assigned', { code: code.substring(0, 4) + '****' });
        return res.status(404).json({
          error: 'Not Found',
          message: 'No M3U URL assigned to this user. Please contact administrator.',
          code: 'M3U_NOT_ASSIGNED'
        });
      }
      
      // Store for TS segment proxying
      this._userM3uUrls.set(code, m3uUrl);
      logger.debug('User M3U URL retrieved', { 
        code: code.substring(0, 4) + '****',
        url: m3uUrl.substring(0, 50) + '...'
      });
    } catch (error) {
      logger.warn('M3U access denied', { error: error.message, code: code.substring(0, 4) + '****' });
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
      let fetchError = null;
      
      // Try 1: Use circuit breaker (normal path)
      try {
        m3uContent = await this._circuitBreaker.fire(m3uUrl);
        logger.info('M3U fetched via circuit breaker', { code: code.substring(0, 4) + '****' });
      } catch (cbError) {
        fetchError = cbError;
        logger.warn('Circuit breaker fetch failed, trying direct fetch', { 
          error: cbError.message,
          circuitBreakerState: this._circuitBreaker.opened ? 'OPEN' : 'CLOSED'
        });
        
        // Try 2: Direct fetch as fallback (bypass circuit breaker)
        try {
          logger.info('Attempting direct fetch fallback', { 
            code: code,
            url: m3uUrl,
            urlLength: m3uUrl.length
          });
          const response = await axios.get(m3uUrl, {
            timeout: 15000,
            maxRedirects: 10,
            responseType: 'text',
            validateStatus: (status) => status < 500,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Connection': 'keep-alive'
            }
          });
          
          if (response.status >= 400) {
            throw new Error(`Provider returned HTTP ${response.status}`);
          }
          m3uContent = response.data;
          logger.info('Direct fetch fallback succeeded', { code: code.substring(0, 4) + '****' });
          
          // Circuit breaker was probably wrong, close it
          if (this._circuitBreaker.opened) {
            this._circuitBreaker.close();
            logger.info('Circuit breaker auto-closed after successful direct fetch');
          }
        } catch (directError) {
          logger.error('Direct fetch fallback also failed', { 
            error: directError.message,
            code: directError.code,
            responseStatus: directError.response?.status
          });
          fetchError = directError;
        }
      }
      
      // If we got content, cache it
      if (m3uContent) {
        await this._cacheService.set(cacheKey, m3uContent, 300);
      } else {
        // Both methods failed
        logger.error('M3U fetch failed (both CB and direct)', { 
          error: fetchError?.message,
          code: code.substring(0, 4) + '****'
        });
        
        let errorMessage = 'Failed to fetch M3U from provider';
        let errorCode = 'M3U_FETCH_ERROR';
        let statusCode = 502;
        
        if (fetchError?.message?.includes('Timeout')) {
          errorMessage = 'Provider connection timeout. Provider may be slow or unreachable.';
          errorCode = 'M3U_PROVIDER_TIMEOUT';
        } else if (fetchError?.message?.includes('DNS')) {
          errorMessage = 'Provider DNS lookup failed. Provider domain may be invalid.';
          errorCode = 'M3U_PROVIDER_DNS_ERROR';
        } else if (fetchError?.response?.status === 404) {
          errorMessage = 'M3U playlist not found on provider (404). The URL may be expired or invalid. Please contact administrator to update M3U URL.';
          errorCode = 'M3U_URL_EXPIRED';
          statusCode = 404;
        } else if (fetchError?.response?.status === 404) {
          errorMessage = 'M3U URL not found (404). Please check if the URL is correct in admin panel.';
          errorCode = 'M3U_URL_NOT_FOUND';
          logger.error('M3U URL returned 404 - URL may be invalid', {
            code: code,
            url: m3uUrl
          });
        } else if (fetchError?.response?.status) {
          errorMessage = `Provider returned HTTP ${fetchError.response.status}`;
          errorCode = 'M3U_PROVIDER_ERROR';
        } else if (this._circuitBreaker.opened) {
          errorMessage = 'Provider is temporarily unavailable. Please try again later.';
          errorCode = 'M3U_CIRCUIT_BREAKER_OPEN';
          statusCode = 503;
        }
        
        return res.status(statusCode).json({
          error: 'Bad Gateway',
          message: errorMessage,
          code: errorCode,
          details: process.env.NODE_ENV === 'development' ? fetchError?.message : undefined
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
          state: this._circuitBreaker.opened ? 'OPEN' : 'CLOSED',
          stats: this._circuitBreaker.stats
        }
      }
    });
  });
  
  /**
   * POST /m3u/reset-circuit-breaker - Manually reset circuit breaker
   * Emergency endpoint when provider recovers but CB is still open
   */
  resetCircuitBreaker = asyncHandler(async (req, res) => {
    const wasOpen = this._circuitBreaker.opened;
    this._circuitBreaker.close();
    logger.info('Circuit breaker manually reset', { wasOpen });
    res.json({
      status: 'success',
      message: 'Circuit breaker reset successfully',
      data: { wasOpen, now: 'CLOSED' }
    });
  });

  /**
   * GET /m3u/test-provider - Test M3U provider connectivity
   * Diagnostic endpoint for troubleshooting 502 errors
   */
  testProvider = asyncHandler(async (req, res) => {
    const testUrl = req.query.url || 'http://sifiriptvdns.com:80/playlist/ZMDNKBkEdd/TcZHZNyps2/m3u_plus';
    
    logger.info('Testing M3U provider connectivity', { url: testUrl.substring(0, 50) + '...' });
    
    const startTime = Date.now();
    
    // Get outbound IP address
    let outboundIp = 'unknown';
    try {
      const { data: ipData } = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
      outboundIp = ipData.ip;
    } catch (e) {
      outboundIp = 'failed-to-fetch';
    }
    
    const diagnostics = {
      url: testUrl,
      serverOutboundIp: outboundIp,
      tests: {}
    };
    
    // Test 1: DNS Resolution
    try {
      const dns = require('dns');
      const { hostname } = new URL(testUrl);
      await new Promise((resolve, reject) => {
        dns.lookup(hostname, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      diagnostics.tests.dns = { status: 'OK', hostname };
    } catch (error) {
      diagnostics.tests.dns = { status: 'FAILED', error: error.message };
    }
    
    // Test 2: HTTP Connection
    try {
      const response = await axios.get(testUrl, {
        timeout: 10000,
        maxRedirects: 2,
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Accept': '*/*'
        }
      });
      
      const duration = Date.now() - startTime;
      diagnostics.tests.http = {
        status: 'OK',
        statusCode: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.data?.length,
        duration: `${duration}ms`,
        preview: response.data?.substring(0, 200)
      };
    } catch (error) {
      diagnostics.tests.http = {
        status: 'FAILED',
        error: error.message,
        code: error.code,
        responseStatus: error.response?.status
      };
    }
    
    // Test 3: Circuit Breaker Status
    diagnostics.tests.circuitBreaker = {
      state: this._circuitBreaker.opened ? 'OPEN' : 'CLOSED',
      stats: this._circuitBreaker.stats
    };
    
    diagnostics.overall = diagnostics.tests.http.status === 'OK' ? 'HEALTHY' : 'DEGRADED';
    
    res.json({
      status: diagnostics.overall === 'HEALTHY' ? 'success' : 'error',
      data: diagnostics
    });
  });

  /**
   * POST /m3u/clear-cache - Clear M3U cache for a user (admin only)
   */
  clearCache = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User code is required'
      });
    }
    
    const cacheKey = `m3u:content:${code}`;
    await this._cacheService.del(cacheKey);
    
    logger.info('M3U cache cleared', { codeMasked: code.substring(0, 4) + '****' });
    
    res.json({
      status: 'success',
      message: `M3U cache cleared for user ${code}`
    });
  });

  /**
   * POST /m3u/reset-circuit-breaker - Reset circuit breaker (admin only)
   */
  resetCircuitBreaker = asyncHandler(async (req, res) => {
    const wasOpen = this._circuitBreaker.opened;
    this._circuitBreaker.close();
    
    logger.info('Circuit breaker manually reset', { wasOpen });
    
    res.json({
      status: 'success',
      message: 'Circuit breaker reset successfully',
      data: {
        wasOpen,
        isNowOpen: this._circuitBreaker.opened,
        stats: this._circuitBreaker.stats
      }
    });
  });
}

module.exports = M3uController;
