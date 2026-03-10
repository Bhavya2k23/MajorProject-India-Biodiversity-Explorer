const { body, validationResult } = require("express-validator");

// Centralized validation result checker
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Register validation rules
exports.registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

// Login validation rules
exports.loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Species validation rules
exports.speciesRules = [
  body("name").trim().notEmpty().withMessage("Species name is required"),
  body("scientificName").trim().notEmpty().withMessage("Scientific name is required"),
  body("type").notEmpty().withMessage("Type is required"),
  body("zone").notEmpty().withMessage("Zone is required"),
  body("ecosystem").notEmpty().withMessage("Ecosystem is required"),
  body("population").isNumeric().withMessage("Population must be a number"),
  body("habitatLoss").isFloat({ min: 0, max: 100 }).withMessage("Habitat loss must be 0-100"),
  body("pollutionLevel").isFloat({ min: 0, max: 100 }).withMessage("Pollution level must be 0-100"),
  body("climateRisk").isFloat({ min: 0, max: 100 }).withMessage("Climate risk must be 0-100"),
  body("conservationStatus").notEmpty().withMessage("Conservation status is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
];
