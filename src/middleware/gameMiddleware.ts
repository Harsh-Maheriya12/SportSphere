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
  // Validate venueLocation before checking timeSlot dates
  if (typeof venueLocation !== 'object' || venueLocation === null) {
    return res.status(400).json({ message: 'venueLocation must be a GeoJSON Point object' });
  }
  if (venueLocation.type !== 'Point') {
    return res.status(400).json({ message: "venueLocation.type must be 'Point'" });
  }
  if (!Array.isArray(venueLocation.coordinates) || venueLocation.coordinates.length !== 2) {
    return res.status(400).json({ message: 'venueLocation.coordinates must be an array of [lng, lat]' });
  }
  const [lng, lat] = venueLocation.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return res.status(400).json({ message: 'venueLocation.coordinates must contain numbers [lng, lat]' });
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return res.status(400).json({ message: 'venueLocation coordinates out of range' });
  }

  // Validate timeSlot dates after venueLocation validation
  if (!timeSlot.startTime || !timeSlot.endTime || isNaN(new Date(timeSlot.startTime).getTime()) || isNaN(new Date(timeSlot.endTime).getTime())) {
    return res.status(400).json({ message: 'Invalid timeSlot' });
  }

  return next();
}

// Middleware to check for time slot conflicts
export const checkTimeSlotConflict = async (req: IUserRequest, res: Response, next: NextFunction) => {
  try {
    const { timeSlot } = req.body;

    // Expect startTime/endTime fields (same as model)
    const start = new Date(timeSlot.startTime);
    const end = new Date(timeSlot.endTime);

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