/**
 * Authentication Controller
 * 
 * Handles user authentication endpoints:
 * - POST /auth/register - Create new user (admin only)
 * - POST /auth/login - Authenticate with code
 * - POST /auth/logout - Invalidate token
 * - GET /auth/me - Get current user info
 * 
 * All responses follow JSend specification.
 */

const logger = require('../../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  constructor(registerUser, loginUser, userRepository, cacheService, jwtConfig) {
    this._registerUser = registerUser;
    this._loginUser = loginUser;
    this._userRepository = userRepository;
    this._cacheService = cacheService;
    this._jwtConfig = jwtConfig;
  }

  /**
   * POST /auth/register
   * Creates a new user with generated code (admin only)
   */
  register = asyncHandler(async (req, res) => {
    const { adminNotes } = req.body;

    const result = await this._registerUser.execute({ adminNotes });

    res.status(201).json({
      status: 'success',
      data: {
        code: result.code,
        status: result.user.status.toString(),
        createdAt: result.user.createdAt.toISOString()
      },
      message: 'User registered successfully. Save this code - it will not be shown again.'
    });
  });

  /**
   * POST /auth/login
   * Authenticate with 16-digit code
   */
  login = asyncHandler(async (req, res) => {
    const { code } = req.body;

    const result = await this._loginUser.execute({ code });

    res.json({
      status: 'success',
      data: {
        token: result.token,
        tokenType: 'Bearer',
        expiresIn: '24h',
        user: result.user
      }
    });
  });

  /**
   * POST /auth/logout
   * Invalidate current token (blacklist)
   */
  logout = asyncHandler(async (req, res) => {
    const token = req.user.token;
    
    // Calculate token remaining TTL
    const decoded = require('jsonwebtoken').decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn > 0) {
      // Add to blacklist with remaining TTL
      await this._cacheService.blacklistToken(token, expiresIn);
    }

    logger.info('User logged out', { 
      codeMasked: req.user.code.substring(0, 4) + '****'
    });

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  });

  /**
   * GET /auth/me
   * Get current authenticated user details
   */
  me = asyncHandler(async (req, res) => {
    const { code } = req.user;

    // Try cache first
    let userData = await this._cacheService.getCachedUser(code);
    
    if (!userData) {
      const Code = require('../../domain/value-objects/Code');
      const codeVo = Code.create(code);
      const user = await this._userRepository.findByCode(codeVo);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      userData = user.toJSON();
      await this._cacheService.cacheUser(code, userData, 300);
    }

    // Add proxy URL for active users
    if (userData.status === 'active') {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userData.m3uProxyUrl = `${baseUrl}/api/m3u/${userData.code}.m3u`;
    }

    res.json({
      status: 'success',
      data: userData
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token (optional feature)
   */
  refresh = asyncHandler(async (req, res) => {
    const { code, status } = req.user;

    // Generate new token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { code, status, type: 'access' },
      this._jwtConfig.secret,
      { 
        expiresIn: this._jwtConfig.expiresIn,
        issuer: 'iptv-platform',
        audience: 'iptv-users'
      }
    );

    res.json({
      status: 'success',
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });
  });
}

module.exports = AuthController;
