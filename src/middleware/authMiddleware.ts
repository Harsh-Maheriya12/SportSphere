import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

interface JwtPayload {
  userId: string;
}

// Express Request interface to include a user property.
export interface IUserRequest extends Request {
  user?: any;
}

/**
 * Middleware: Protect routes by verifying JWT in the Authorization header.
 * Provides detailed, expressive error messages for easier debugging.
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;
  let decoded: JwtPayload;

  // 1. Validate Authorization header presence and format
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401);
    throw new Error('Authorization header missing — token not provided.');
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error("Invalid Authorization format — expected 'Bearer <token>'.");
  }

  // 2. Extract token
  token = authHeader.split(' ')[1];
  if (!token || token.trim() === '') {
    res.status(401);
    throw new Error('Token is empty — please provide a valid token after \'Bearer\'.');
  }

  // 3. Verify token validity
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401);
      throw new Error('Token verification failed — token has expired.');
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401);
      throw new Error('Token verification failed — invalid or tampered token.');
    } else if (error instanceof jwt.NotBeforeError) {
      res.status(401);
      throw new Error('Token verification failed — token not yet active.');
    } else {
      res.status(401);
      throw new Error(`Unexpected token verification error: ${error.message}`);
    }
  }

  // 4. Fetch user associated with token
  try {
    const user = await User.findById(decoded.userId).select("-password");
    
    req.user = {
      _id: user._id.toString(),   
      role: user.role,
      email: user.email,
      username: user.username,
    };
  } catch (dbError: any) {
    res.status(500);
    throw new Error(`Database lookup failed — could not retrieve user: ${dbError.message}`);
  }

  if (!req.user) {
    res.status(401);
    throw new Error('Authentication failed — user not found or has been removed.');
  }

  // 5. Pass control if everything checks out
  next();
});
