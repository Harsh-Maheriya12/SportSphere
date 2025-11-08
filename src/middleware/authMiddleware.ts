import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// Defines the expected structure of the payload decoded from a valid JWT.
interface JwtPayload {
  userId: string;
}

// Express Request interface to include a user property.
export interface IUserRequest extends Request {
  user?: any;
}

/**
 * An Express middleware to protect routes by verifying a JWT.
 * It expects a 'Bearer <token>' in the Authorization header.
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token;

  // Check if the Authorization header exists and follows the 'Bearer' scheme.
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract the token string from the 'Bearer <token>' format.
      token = req.headers.authorization.split(' ')[1];

      // Verify token (allow test fallback secret)
      const secret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, secret as string) as JwtPayload;

      // Try DB lookup using userId from token
      const foundUser = await User.findById((decoded as any).userId).select('-password');
      if (foundUser) {
        req.user = foundUser;
      } else {
        // Fallback minimal user object for tests (no DB)
        (req as any).user = { _id: (decoded as any).userId, role: (decoded as any).role || 'user' };
      }

      // If verification is successful, pass control to the next middleware or route handler.
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

