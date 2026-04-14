// ============================================================
// FILE: backend/middleware/adminAuth.js  ← NEW FILE
// ============================================================
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware: Protect admin routes — verifies JWT and attaches admin to req
 */
const adminAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'biodiversity_admin_jwt_secret_2024'
    );

    // Check admin exists and is active
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found. Token invalid.',
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated.',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
    }
    res.status(500).json({ success: false, message: 'Server error in auth middleware.' });
  }
};

/**
 * Middleware: Require superadmin role
 */
const superAdminOnly = (req, res, next) => {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Superadmin role required.',
    });
  }
  next();
};

module.exports = { adminAuth, superAdminOnly };