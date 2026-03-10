const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
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
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Only allow admin role if explicitly set by another admin (prevent privilege escalation)
    const userRole = role === "admin" ? "user" : role || "user";

    const user = await User.create({ name, email, password, role: userRole });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
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
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
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
    res.status(200).json({ success: true, user });
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
    res.status(200).json({
      success: true,
      message: isFavorite ? "Removed from favorites" : "Added to favorites",
      favorites: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout (client-side token removal, server-side stub)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
};
