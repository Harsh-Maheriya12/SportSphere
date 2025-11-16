import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import User from "../models/User";

// Validation rules for user registration (express-validator)
export const validateRegister = [
  // Username: required, trimmed, sanitized
  body("username", "Username is required").not().isEmpty().trim().escape(),

  // Email: valid format, normalized, must not already exist
  body("email", "Please include a valid email")
    .isEmail()
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return Promise.reject("User already exists");
      }
    }),

  // Password: minimum 6 characters (optional for Google OAuth)
  body("password")
    .if((value: any, { req }: any) => req.body.authProvider !== "google")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  // Role: must be one of the allowed values
  body("role", "Role is required")
    .not()
    .isEmpty()
    .isIn(["player", "venue-owner", "coach", "admin"])
    .withMessage("Role must be one of: player, venue-owner, coach, admin"),

  // Age: required, integer between 13 and 120
  body("age", "Age is required")
    .not()
    .isEmpty()
    .isInt({ min: 13, max: 120 })
    .withMessage("Age must be between 13 and 120"),

  // Gender: must be one of the allowed values
  body("gender", "Gender is required")
    .not()
    .isEmpty()
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be one of: male, female, other"),

  // Error handler: collect all validation errors and return them
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    return next();
  },
];