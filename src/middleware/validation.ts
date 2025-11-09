import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import AppError from '../utils/AppError';

export const validateRegister = [
  body('username')
    .notEmpty().withMessage('Username is required')
    .trim()
    .escape(),

  body('email')
    .isEmail().withMessage('Please include a valid email')
    .normalizeEmail()
    .custom(async (email) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new AppError('User already exists', 400, { field: 'email' });
      }
    }),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  // Final middleware for validation result handling
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Pass a standardized AppError to the centralized error handler
      return next(new AppError('Validation failed', 400, errors.array()));
    }

    // Validation succeeded
    return next();
  },
];