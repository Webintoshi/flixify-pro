/**
 * API Routes Configuration
 * 
 * Versioned API routes with proper middleware chain:
 * 1. Rate limiting
 * 2. Authentication (optional/required)
 * 3. Validation
 * 4. Controller
 * 
 * Route Structure:
 * /api/v1/auth/*     - Authentication endpoints
 * /api/v1/admin/*    - Admin operations (admin auth required)
 * /api/v1/m3u/*      - M3U proxy (user auth required)
 */

const express = require('express');
const logger = require('../../config/logger');

function createRoutes({
  authController,
  adminController,
  m3uController,
  authMiddleware,
  optionalAuthMiddleware,
  rateLimiters,
  validators,
  userRepository
}) {
  const router = express.Router();

  // Health check (no auth required)
  router.get('/health', (req, res) => {
    res.json({
      status: 'success',
      data: {
        service: 'iptv-platform',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
  });

  // =============================================================================
  // AUTHENTICATION ROUTES
  // =============================================================================
  
  // POST /api/v1/auth/register - Create new user (admin only)
  router.post(
    '/auth/register',
    rateLimiters.admin,
    authMiddleware,
    authController.register
  );

  // POST /api/v1/auth/register-public - Public user registration (no auth required)
  router.post(
    '/auth/register-public',
    rateLimiters.auth,
    async (req, res) => {
      try {
        const User = require('../../domain/entities/User');
        
        // Create user
        const user = User.create('Anonymous User');
        const savedUser = await userRepository.save(user);
        
        // Get code string value
        const codeString = savedUser.code.value || savedUser.code.toString();
        
        logger.info('Public user registered', { 
          codeMasked: codeString.substring(0, 4) + '****' 
        });
        
        res.status(201).json({
          status: 'success',
          data: {
            code: codeString,
            formattedCode: codeString.match(/.{4}/g).join(' '),
            status: savedUser.status.toString(),
            createdAt: savedUser.createdAt.toISOString()
          },
          message: 'Account created successfully. Save your account number - it will not be shown again.'
        });
      } catch (error) {
        logger.error('Public registration error', { error: error.message });
        res.status(500).json({
          status: 'error',
          message: 'Failed to create account'
        });
      }
    }
  );

  // POST /api/v1/auth/login - Login with code
  router.post(
    '/auth/login',
    rateLimiters.auth,
    validators.login,
    authController.login
  );

  // POST /api/v1/auth/logout - Logout (invalidate token)
  router.post(
    '/auth/logout',
    rateLimiters.global,
    authMiddleware,
    authController.logout
  );

  // GET /api/v1/auth/me - Get current user
  router.get(
    '/auth/me',
    rateLimiters.global,
    authMiddleware,
    authController.me
  );

  // POST /api/v1/auth/refresh - Refresh token
  router.post(
    '/auth/refresh',
    rateLimiters.global,
    authMiddleware,
    authController.refresh
  );

  // =============================================================================
  // ADMIN ROUTES
  // =============================================================================
  
  // POST /api/v1/admin/login - Admin login
  router.post(
    '/admin/login',
    rateLimiters.auth,
    adminController.login
  );
  
  // GET /api/v1/admin/users - List users
  router.get(
    '/admin/users',
    rateLimiters.admin,
    authMiddleware,
    adminController.listUsers
  );

  // GET /api/v1/admin/users/:code - Get user details
  router.get(
    '/admin/users/:code',
    rateLimiters.admin,
    authMiddleware,
    validators.m3uProxy,
    adminController.getUser
  );

  // PUT /api/v1/admin/users/:code/activate - Activate user
  router.put(
    '/admin/users/:code/activate',
    rateLimiters.admin,
    authMiddleware,
    validators.activateUser,
    adminController.activateUser
  );

  // PUT /api/v1/admin/users/:code/suspend - Suspend user
  router.put(
    '/admin/users/:code/suspend',
    rateLimiters.admin,
    authMiddleware,
    validators.m3uProxy,
    adminController.suspendUser
  );

  // PUT /api/v1/admin/users/:code/notes - Update admin notes
  router.put(
    '/admin/users/:code/notes',
    rateLimiters.admin,
    authMiddleware,
    validators.m3uProxy,
    validators.updateNotes,
    adminController.updateNotes
  );

  // DELETE /api/v1/admin/users/:code - Delete user
  router.delete(
    '/admin/users/:code',
    rateLimiters.admin,
    authMiddleware,
    validators.m3uProxy,
    adminController.deleteUser
  );

  // GET /api/v1/admin/stats - Get statistics
  router.get(
    '/admin/stats',
    rateLimiters.admin,
    authMiddleware,
    adminController.getStats
  );

  // =============================================================================
  // M3U PROXY ROUTES
  // =============================================================================
  
  // GET /api/v1/m3u/:code.m3u - Real M3U proxy
  router.get(
    '/m3u/:code.m3u',
    rateLimiters.m3u,
    validators.m3uProxy,
    m3uController.proxyM3u  // Real M3U from provider
  );

  // GET /api/v1/m3u/health - M3U proxy health check
  router.get(
    '/m3u/health',
    m3uController.healthCheck
  );
  
  // GET /api/v1/m3u/public/raw - Public M3U for frontend (no auth required, CORS enabled)
  // In-memory cache for M3U content
  let m3uCache = { data: null, timestamp: 0 };
  const CACHE_TTL = 120000; // 2 minutes
  
  router.get(
    '/m3u/public/raw',
    rateLimiters.m3u,
    async (req, res) => {
      try {
        const axios = require('axios');
        const now = Date.now();
        
        // Return cached data if fresh
        if (m3uCache.data && (now - m3uCache.timestamp) < CACHE_TTL) {
          res.set({
            'Content-Type': 'application/x-mpegURL',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60',
            'X-Cache': 'HIT'
          });
          return res.send(m3uCache.data);
        }
        
        const response = await axios.get('http://sifiriptvdns.com:80/playlist/ZMDNKBkEdd/TcZHZNyps2/m3u_plus', {
          timeout: 30000,
          responseType: 'text',
          headers: {
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
            'Accept': '*/*'
          },
          maxRedirects: 5
        });
        
        // Update cache
        m3uCache = { data: response.data, timestamp: now };
        
        res.set({
          'Content-Type': 'application/x-mpegURL',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'MISS'
        });
        
        res.send(response.data);
      } catch (error) {
        // If we have stale cache, return it
        if (m3uCache.data) {
          res.set({
            'Content-Type': 'application/x-mpegURL',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=60',
            'X-Cache': 'STALE'
          });
          return res.send(m3uCache.data);
        }
        
        res.status(502).json({ 
          error: 'Failed to fetch M3U',
          message: error.message 
        });
      }
    }
  );
  
  // GET /api/v1/stream/:code - Proxy TS segments (CORS bypass)
  router.get(
    '/stream/:code',
    rateLimiters.m3u,
    m3uController.proxyStream
  );
  
  // GET /api/v1/media/info - Get media codec information
  router.get('/media/info', rateLimiters.global, async (req, res) => {
    try {
      const { url } = req.query;
      if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
      }
      
      // Check if ffprobe is available
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      try {
        await execPromise('which ffprobe');
      } catch {
        // ffprobe not available, return basic info
        return res.json({
          url,
          codecs: {
            video: 'Unknown (FFprobe not installed)',
            audio: 'Unknown (FFprobe not installed)'
          },
          browserCompatibility: {
            chrome: 'May vary',
            firefox: 'May vary',
            safari: 'May vary'
          },
          recommendations: [
            'Use VLC for best compatibility with MKV files',
            'Try different browsers (Chrome, Firefox, Edge)',
            'Check if audio codec is supported by your browser'
          ]
        });
      }
      
      // If ffprobe is available, analyze the stream
      const { stdout } = await execPromise(
        `ffprobe -v quiet -print_format json -show_streams "${url}"`,
        { timeout: 30000 }
      );
      
      const probeData = JSON.parse(stdout);
      const videoStream = probeData.streams.find(s => s.codec_type === 'video');
      const audioStream = probeData.streams.find(s => s.codec_type === 'audio');
      
      // Check browser compatibility
      const audioCodec = audioStream?.codec_name || 'unknown';
      const videoCodec = videoStream?.codec_name || 'unknown';
      
      const compatibility = {
        chrome: checkChromeCompatibility(videoCodec, audioCodec),
        firefox: checkFirefoxCompatibility(videoCodec, audioCodec),
        safari: checkSafariCompatibility(videoCodec, audioCodec)
      };
      
      res.json({
        url,
        format: probeData.format?.format_name || 'unknown',
        duration: probeData.format?.duration,
        bit_rate: probeData.format?.bit_rate,
        codecs: {
          video: videoCodec,
          audio: audioCodec,
          audioChannels: audioStream?.channels,
          audioSampleRate: audioStream?.sample_rate
        },
        browserCompatibility: compatibility,
        recommendations: generateRecommendations(audioCodec, videoCodec)
      });
      
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to analyze media',
        message: error.message 
      });
    }
  });
  
  // GET /api/v1/media/fix-audio - Get audio fix options
  router.get('/media/fix-audio', rateLimiters.global, async (req, res) => {
    const { url, title } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    // Generate VLC stream URL
    const vlcUrl = `vlc://${url}`;
    
    // Generate alternative options
    res.json({
      originalUrl: url,
      title: title || 'Unknown',
      solutions: [
        {
          name: 'VLC Media Player',
          description: 'Best MKV and codec support',
          url: vlcUrl,
          downloadUrl: 'https://www.videolan.org/vlc/',
          icon: 'vlc'
        },
        {
          name: 'MX Player (Android)',
          description: 'Best for Android devices',
          instructions: 'Copy URL and open in MX Player'
        },
        {
          name: 'IINA (Mac)',
          description: 'Modern Mac video player',
          downloadUrl: 'https://iina.io/'
        },
        {
          name: 'PotPlayer (Windows)',
          description: 'Advanced Windows player',
          downloadUrl: 'https://potplayer.daum.net/'
        }
      ],
      browserTips: [
        'Try Chrome if audio not working in other browsers',
        'Disable hardware acceleration in browser settings',
        'Check if browser has audio permissions for the site'
      ]
    });
  });

  return router;
}

// Helper functions for browser compatibility
function checkChromeCompatibility(videoCodec, audioCodec) {
  const supportedAudio = ['aac', 'mp3', 'opus', 'vorbis', 'flac'];
  const supportedVideo = ['h264', 'vp8', 'vp9', 'av1'];
  
  const audioOK = supportedAudio.includes(audioCodec.toLowerCase());
  const videoOK = supportedVideo.includes(videoCodec.toLowerCase());
  
  if (audioOK && videoOK) return 'Fully Supported';
  if (videoOK && !audioOK) return 'Video OK, Audio may have issues';
  return 'Limited Support';
}

function checkFirefoxCompatibility(videoCodec, audioCodec) {
  const supportedAudio = ['aac', 'mp3', 'opus', 'vorbis', 'flac', 'ac3'];
  const supportedVideo = ['h264', 'vp8', 'vp9', 'av1'];
  
  const audioOK = supportedAudio.includes(audioCodec.toLowerCase());
  const videoOK = supportedVideo.includes(videoCodec.toLowerCase());
  
  if (audioOK && videoOK) return 'Fully Supported';
  if (videoOK && !audioOK) return 'Video OK, Audio may have issues';
  return 'Limited Support';
}

function checkSafariCompatibility(videoCodec, audioCodec) {
  const supportedAudio = ['aac', 'mp3'];
  const supportedVideo = ['h264'];
  
  const audioOK = supportedAudio.includes(audioCodec.toLowerCase());
  const videoOK = supportedVideo.includes(videoCodec.toLowerCase());
  
  if (audioOK && videoOK) return 'Fully Supported';
  return 'Limited Support (Use alternative player)';
}

function generateRecommendations(audioCodec, videoCodec) {
  const recs = [];
  
  if (audioCodec.toLowerCase() === 'ac3' || audioCodec.toLowerCase() === 'dts') {
    recs.push('Audio codec (AC3/DTS) not supported by most browsers. Use VLC.');
  }
  if (audioCodec.toLowerCase() === 'eac3') {
    recs.push('Enhanced AC3 may have compatibility issues. Try Chrome or VLC.');
  }
  if (videoCodec.toLowerCase() === 'hevc' || videoCodec.toLowerCase() === 'h265') {
    recs.push('H265/HEVC video requires hardware support. Use VLC if stuttering.');
  }
  
  if (recs.length === 0) {
    recs.push('Should work in most modern browsers');
  }
  
  return recs;
}

module.exports = createRoutes;
