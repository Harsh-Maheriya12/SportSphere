import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import User from '../models/User';
import Venue from '../models/Venue';
import CoachDetail from '../models/coach/CoachDetail';
import Ticket from '../models/Ticket';

// List & search users
export const listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q, role, page = 1, limit = 50 } = req.query as any;
  const filter: any = {};
  if (role) filter.role = role;
  if (q) {
    const regex = new RegExp(q, 'i');
    filter.$or = [{ username: regex }, { email: regex }];
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await User.countDocuments(filter);

  res.json({ success: true, data: users, total });
});

// Get single user
export const getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id).select('-password');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }
  res.json({ success: true, data: user });
});

// Delete user
export const deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  await User.deleteOne({ _id: user._id });
  res.json({ success: true, message: 'User deleted' });
});

// List coaches
export const listCoaches = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q, status, page = 1, limit = 50 } = req.query as any;
  const userFilter: any = { role: 'coach' };
  if (q) {
    const regex = new RegExp(q, 'i');
    userFilter.$or = [{ username: regex }, { email: regex }];
  }

  const users = await User.find(userFilter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const results = await Promise.all(
    users.map(async (u) => {
      const detail = await CoachDetail.findOne({ coachId: u._id });
      return { user: u, detail };
    })
  );

  const total = await User.countDocuments(userFilter);
  res.json({ success: true, data: results, total });
});

// Delete coach
export const deleteCoach = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user || user.role !== 'coach') {
    res.status(404).json({ success: false, message: 'Coach not found' });
    return;
  }

  await User.deleteOne({ _id: user._id });
  try {
    await CoachDetail.deleteOne({ coachId: user._id });
  } catch (e) {
    console.warn('Failed to delete coach detail', e);
  }
  res.json({ success: true, message: 'Coach deleted' });
});

// List venue owners
export const listVenueOwners = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { q, page = 1, limit = 50 } = req.query as any;
  const userFilter: any = { role: 'venue-owner' };
  if (q) {
    const regex = new RegExp(q, 'i');
    userFilter.$or = [{ username: regex }, { email: regex }];
  }

  const users = await User.find(userFilter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const results = await Promise.all(
    users.map(async (u) => {
      const venues = await Venue.find({ owner: u._id }).select('name');
      return { user: u, venues };
    })
  );

  const total = await User.countDocuments(userFilter);
  res.json({ success: true, data: results, total });
});

// Delete venue owner
export const deleteVenueOwner = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user || user.role !== 'venue-owner') {
    res.status(404).json({ success: false, message: 'Venue owner not found' });
    return;
  }

  await User.deleteOne({ _id: user._id });
  res.json({ success: true, message: 'Venue owner deleted' });
});

// Overview stats
export const getOverviewStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
  const totalVenueOwners = await User.countDocuments({ role: 'venue-owner' });
  const totalCoaches = await User.countDocuments({ role: 'coach' });
  const pendingTickets = await Ticket.countDocuments({ status: 'Open' });

  res.json({
    success: true,
    data: { totalUsers, totalVenueOwners, totalCoaches, pendingTickets },
  });
});

export default {};