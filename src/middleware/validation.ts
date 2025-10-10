// FILE PATH: src/middleware/validation.ts

import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// This is an array of Express middleware functions that defines the validation chain.
// Each function in the array will be executed sequentially by Express.
export const validateRegister = [
  // Defines a validation rule for the 'username' field in the request body.
  body('username', 'Username is required')
    .not().isEmpty() // Asserts that the field is not empty.
    .trim()          // Removes any leading or trailing whitespace.
    .escape(),       // Sanitizer: Converts special HTML characters (e.g., <, >) to their escaped equivalents, preventing XSS.

  // Defines validation rules for the 'email' field.
  body('email', 'Please include a valid email')
    .isEmail()         // Asserts that the field is a valid email format.
    .normalizeEmail()  // Sanitizer: Standardises the email address (e.g., converts to lowercase).
    .custom(async (email) => {
      // Defines a custom, asynchronous validation rule.
      // This checks the database to ensure the email is unique.
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // If a user is found, the validation fails by rejecting the promise.
        return Promise.reject('User already exists');
      }
    }),

  // Defines a validation rule for the 'password' field.
  body('password', 'Password must be at least 6 characters')
    .isLength({ min: 6 }), // Asserts that the string length is at least 6 characters.

  // This is the final middleware in the chain. It checks the result of all preceding validations.
  (req: Request, res: Response, next: NextFunction) => {
    // Collects any validation errors that were found.
    const errors = validationResult(req);
    // If the errors array is not empty, it means validation failed.
    if (!errors.isEmpty()) {
      // Terminate the request and send a 400 Bad Request response with the specific errors.
      return res.status(400).json({ errors: errors.array() });
    }
    // If validation is successful, pass control to the next middleware (the main route handler).
    return next();
  },
];