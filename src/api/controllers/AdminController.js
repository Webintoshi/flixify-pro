/**
 * Admin Controller
 * 
 * Administrative endpoints for user management:
 * - GET /admin/users - List all users
 * - GET /admin/users/:code - Get user details
 * - PUT /admin/users/:code/activate - Activate user with M3U
 * - PUT /admin/users/:code/suspend - Suspend user
 * - PUT /admin/users/:code/notes - Update admin notes
 * - DELETE /admin/users/:code - Delete user
 * - GET /admin/stats - User statistics
 * 
 * All operations require admin authentication.
 */

const logger = require('../../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const Code = require('../../domain/value-objects/Code');

class AdminController {
  constructor(userRepository, activateUser, cacheService, adminRepository) {
    this._userRepository = userRepository;
    this._activateUser = activateUser;
    this._cacheService = cacheService;
    this._adminRepository = adminRepository;
  }

  /**
   * POST /admin/login
   * Admin login with email and password
   */
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Find admin by email
    const admin = await this._adminRepository.findByEmail(email);

    if (!admin) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Verify password (bcrypt compare)
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await this._adminRepository.updateLastLogin(admin.id);

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        adminId: admin.id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET || 'dev-jwt-secret-key-for-local-testing-only-change-in-production',
      { expiresIn: '24h' }
    );

    logger.info('Admin logged in', { email: admin.email });

    res.json({
      status: 'success',
      data: {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role
        }
      }
    });
  });

  /**
   * GET /admin/users
   * List all users with pagination and filtering
   */
  listUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status || null;
    const offset = (page - 1) * limit;

    const result = await this._userRepository.findAll({ limit, offset, status });

    res.json({
      status: 'success',
      data: {
        users: result.users.map(u => u.toJSON()),
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit)
        }
      }
    });
  });

  /**
   * GET /admin/users/:code
   * Get specific user details
   */
  getUser = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const codeVo = Code.create(code);

    const user = await this._userRepository.findByCode(codeVo);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const userData = user.toJSON();
    
    // Include M3U URL for admin view
    if (user.m3uUrl) {
      userData.m3uUrl = user.m3uUrl.toLogString(); // Masked for security
    }

    // Add computed fields
    userData.canAccessContent = user.canAccessContent();
    userData.isExpired = user.isExpired();

    res.json({
      status: 'success',
      data: userData
    });
  });

  /**
   * PUT /admin/users/:code/activate
   * Activate user with M3U URL
   */
  activateUser = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const { m3uUrl, expiresAt, adminNotes } = req.body;

    const activatedUser = await this._activateUser.execute({
      code,
      m3uUrl,
      expiresAt,
      adminNotes
    });

    res.json({
      status: 'success',
      data: activatedUser.toJSON(),
      message: 'User activated successfully'
    });
  });

  /**
   * PUT /admin/users/:code/suspend
   * Suspend user access
   */
  suspendUser = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const { reason } = req.body;

    const codeVo = Code.create(code);
    const user = await this._userRepository.findByCode(codeVo);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const suspendedUser = user.suspend(reason);
    const savedUser = await this._userRepository.update(suspendedUser);

    // Invalidate cache
    await this._cacheService.invalidateUser(code);

    logger.info('User suspended by admin', { 
      adminCode: req.user?.code?.substring(0, 4) + '****',
      targetCode: codeVo.toMaskedString(),
      reason
    });

    res.json({
      status: 'success',
      data: savedUser.toJSON(),
      message: 'User suspended successfully'
    });
  });

  /**
   * PUT /admin/users/:code/notes
   * Update admin notes
   */
  updateNotes = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const { adminNotes } = req.body;

    const codeVo = Code.create(code);
    const user = await this._userRepository.findByCode(codeVo);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Reconstruct user with new notes
    const User = require('../../domain/entities/User');
    const updatedUser = new User({
      ...user.toPersistence(),
      admin_notes: adminNotes,
      updated_at: new Date()
    });

    const savedUser = await this._userRepository.update(updatedUser);

    // Invalidate cache
    await this._cacheService.invalidateUser(code);

    res.json({
      status: 'success',
      data: savedUser.toJSON(),
      message: 'Admin notes updated'
    });
  });

  /**
   * DELETE /admin/users/:code
   * Delete user permanently
   */
  deleteUser = asyncHandler(async (req, res) => {
    const { code } = req.params;

    const codeVo = Code.create(code);
    const user = await this._userRepository.findByCode(codeVo);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    await this._userRepository.delete(user.id);

    // Invalidate cache
    await this._cacheService.invalidateUser(code);

    logger.info('User deleted by admin', { 
      adminCode: req.user?.code?.substring(0, 4) + '****',
      targetCode: codeVo.toMaskedString()
    });

    res.json({
      status: 'success',
      message: 'User deleted successfully'
    });
  });

  /**
   * GET /admin/stats
   * User statistics
   */
  getStats = asyncHandler(async (req, res) => {
    const counts = await this._userRepository.countByStatus();

    // Get recently expired users
    const expiredUsers = await this._userRepository.findExpired();

    res.json({
      status: 'success',
      data: {
        counts,
        recentlyExpired: expiredUsers.length,
        timestamp: new Date().toISOString()
      }
    });
  });
}

module.exports = AdminController;
