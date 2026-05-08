const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendResponse } = require("../utils/apiResponse");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "default_jwt_secret_fallback_key", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendResponse(res, 400, null, "Email already registered", false);
    }

    // Only allow admin role if explicitly set by another admin (prevent privilege escalation)
    const userRole = role === "admin" ? "user" : role || "user";

    const user = await User.create({ name, email, password, role: userRole });
    const token = generateToken(user._id);

    sendResponse(res, 201, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, "Registration successful");
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return sendResponse(res, 401, null, "Invalid email or password", false);
    }

    const token = generateToken(user._id);

    sendResponse(res, 200, { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }, "Login successful");
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("favorites", "name scientificName conservationStatus image");
    sendResponse(res, 200, { user }, "User profile fetched successfully");
  } catch (error) {
    next(error);
  }
};

// @desc    Add/remove species from favorites
// @route   PUT /api/auth/favorites/:speciesId
// @access  Private
exports.toggleFavorite = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const speciesId = req.params.speciesId;

    const isFavorite = user.favorites.includes(speciesId);
    if (isFavorite) {
      user.favorites = user.favorites.filter((id) => id.toString() !== speciesId);
    } else {
      user.favorites.push(speciesId);
    }

    await user.save();
    sendResponse(res, 200, { favorites: user.favorites }, isFavorite ? "Removed from favorites" : "Added to favorites");
  } catch (error) {
    next(error);
  }
};

// @desc    Logout (client-side token removal, server-side stub)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  sendResponse(res, 200, null, "Logged out successfully");
};
