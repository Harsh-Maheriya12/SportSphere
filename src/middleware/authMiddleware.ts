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

      // Verify the token's signature and expiration using the JWT_SECRET.
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

      // Use the userId from the token payload to fetch the user from the database.
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
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

