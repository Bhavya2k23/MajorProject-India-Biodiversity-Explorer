const express = require("express");
const router = express.Router();
const { register, login, logout, getMe, toggleFavorite } = require("../controllers/authController");
const { protect } = require("../middleware/auth");
const { registerRules, loginRules, validate } = require("../middleware/validation");

router.post("/register", registerRules, validate, register);
router.post("/login", loginRules, validate, login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/favorites/:speciesId", protect, toggleFavorite);

module.exports = router;
