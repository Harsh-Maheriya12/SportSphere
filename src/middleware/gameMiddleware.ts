import { Request, Response, NextFunction } from 'express';
import { IUserRequest } from '../middleware/authMiddleware'; 
import Game from '../models/gameModels';

// Middleware to authorize roles
export const authorizeRoles = (...roles: string[]) => {
  return (req: IUserRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    return next();
  };
};

// Middleware to validate game input
export const validateGameInput = (req: IUserRequest, res: Response, next: NextFunction) => {
  const { sport, description, playersNeeded, timeSlot, venueLocation } = req.body;
  if (!sport || !description || !playersNeeded || !timeSlot || !venueLocation) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // playersNeeded should have numeric min and max
  if (typeof playersNeeded.min !== 'number' || typeof playersNeeded.max !== 'number') {
    return res.status(400).json({ message: 'playersNeeded.min and playersNeeded.max must be numbers' });
  }

  // timeSlot must have startTime and endTime (consistent with Game model)
  if (!timeSlot.startTime || !timeSlot.endTime) {
    return res.status(400).json({ message: 'timeSlot.startTime and timeSlot.endTime are required' });
  }

  return next();
}

// Middleware to check for time slot conflicts
export const checkTimeSlotConflict = async (req: IUserRequest, res: Response, next: NextFunction) => {
  try {
    const { timeSlot } = req.body;
    if (!timeSlot) {
      return res.status(400).json({ message: 'Time slot is required' });
    }

    // Expect startTime/endTime fields (same as model)
    const start = new Date(timeSlot.startTime);
    const end = new Date(timeSlot.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid timeSlot' });
    }

    if (end <= start) {
      // Keep error message compatible with tests that expect the substring 'Invalid timeSlot'
      return res.status(400).json({ message: 'Invalid timeSlot: end time must be after start time' });
    }

    // Disallow scheduling in the past.
    const now = new Date();
    if (start.getTime() < now.getTime() - 1000) {
      return res.status(400).json({ message: 'Time slot cannot be in the past' });
    }

    // Overlap check: find any existing game for this host where
    // existing.start < new.end AND existing.end > new.start
    const existingGame = await Game.findOne({
      host: req.user._id,
      'timeSlot.startTime': { $lt: end },
      'timeSlot.endTime': { $gt: start },
    });

    if (existingGame) {
      return res.status(400).json({ message: 'You already have a game scheduled in this time slot' });
    }

    return next(); // No conflict, proceed to create game
  } catch (error: any) {
    return res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};