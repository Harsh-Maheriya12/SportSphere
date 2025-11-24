import { Request, Response, NextFunction } from 'express';
import { IUserRequest } from '../middleware/authMiddleware'; 
import Game from '../models/gameModels';

// Middleware to authorize roles
export const authorizeRoles = (...roles: string[]) => {
  return (req: IUserRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    return next();
  };
};
