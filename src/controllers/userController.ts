import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/User';

/**
 * @desc    Get the profile of the currently logged-in user.
 * @route   GET /api/users/profile
 * @access  Private (requires a valid JWT)
 */
export const getUserProfile = asyncHandler(async (req: Request, res: Response) => {
  // The `req.user` object is guaranteed to be available here because this handler
  // is only executed after the `protect` authentication middleware has run successfully.
  // The `protect` middleware is responsible for validating the JWT and attaching the user.
  const user = await User.findById(req.user?._id);

  // Check if a user was successfully found in the database.
  if (user) {
    // If found, send back a curated user object, excluding sensitive information.
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } else {
    // If no user is found for the ID from the token (e.g., the user was deleted
    // after the token was issued), send a 404 Not Found error.
    res.status(404);
    throw new Error('User not found');
  }
});
