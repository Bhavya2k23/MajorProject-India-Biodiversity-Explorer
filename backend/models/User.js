// ============================================================
// FILE: backend/models/User.js — FULLY FIXED VERSION
//
// FIXES APPLIED:
//  FIX 1 — Added 'plantFavorites' array (was only 'favorites' for
//           species — Plants page "Save" button was broken because
//           no plant favorites field existed)
//  FIX 2 — Added 'avatar' field (Profile page shows avatar)
//  FIX 3 — Added 'bio' field (Profile page)
//  FIX 4 — comparePassword was using 'this.password' but password
//           field has select:false — method now accepts plaintext
//           and works correctly even when password not in query
//  FIX 5 — Added 'isActive' boolean for admin user management
//  FIX 6 — Added 'lastLogin' date — updated on each login
//  FIX 7 — Added 'totalQuizScore' virtual for Leaderboard page
//  FIX 8 — Added pre-save hook safety: skip hash if password
//           unchanged (was already there but added null check)
//  FIX 9 — Added 'loginAttempts' + 'lockUntil' for brute-force
//           protection (admin panel security)
//  FIX 10 — Added static method 'findByEmail' for clean auth code
// ============================================================

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// ─── Sub-Schema: Quiz Score ───────────────────────────────────
const quizScoreSchema = new mongoose.Schema(
  {
    score:     { type: Number, required: true },
    total:     { type: Number, required: true },
    category:  { type: String, default: "General" },
    dateTaken: { type: Date,   default: Date.now },
  },
  { _id: true }
);

// ─── Main Schema ─────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Core Identity ─────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ── Profile ───────────────────────────────────────────────
    // FIX 2: avatar — shown on Profile page
    avatar: {
      type: String,
      default: "",
    },
    // FIX 3: bio — shown on Profile page
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },

    // ── Favorites ─────────────────────────────────────────────
    favorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Species",
    }],
    // FIX 1: plantFavorites — Plants page "Save" button was broken
    plantFavorites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plant",
    }],

    // ── Quiz History ──────────────────────────────────────────
    quizScores: [quizScoreSchema],

    // ── Account Status ────────────────────────────────────────
    // FIX 5: isActive — admin can deactivate users
    isActive: {
      type: Boolean,
      default: true,
    },
    // FIX 6: lastLogin — tracked on each login
    lastLogin: {
      type: Date,
      default: null,
    },
    // FIX 9: brute-force protection
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: totalQuizScore ──────────────────────────────────
// FIX 7: used by Leaderboard page
userSchema.virtual("totalQuizScore").get(function () {
  if (!this.quizScores || this.quizScores.length === 0) return 0;
  return this.quizScores.reduce((sum, s) => sum + (s.score || 0), 0);
});

// ─── Virtual: isLocked ───────────────────────────────────────
// FIX 9: true if account is temporarily locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Pre-Save: Hash Password ──────────────────────────────────
// FIX 8: null check added — skip if password not modified or missing
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance Method: comparePassword ────────────────────────
// FIX 4: works correctly even when password field excluded from query
userSchema.methods.comparePassword = async function (candidatePassword) {
  // If password not loaded (select:false), this returns false safely
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: incLoginAttempts ───────────────────────
// FIX 9: call this on failed login — locks after 5 attempts
const LOCK_TIME    = 2 * 60 * 60 * 1000; // 2 hours
const MAX_ATTEMPTS = 5;

userSchema.methods.incLoginAttempts = async function () {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

// ─── Static Method: findByEmail ──────────────────────────────
// FIX 10: clean way to find user with password included
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select("+password");
};

// ─── Indexes ─────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ "quizScores.score": -1 }); // Leaderboard sorting

module.exports = mongoose.model("User", userSchema);
