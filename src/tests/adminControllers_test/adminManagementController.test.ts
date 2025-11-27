import { Request, Response, NextFunction } from 'express';
import {
  listUsers,
  getUserById,
  deleteUser,
  listCoaches,
  deleteCoach,
  listVenueOwners,
  deleteVenueOwner,
  getOverviewStats,
} from '../../controllers/adminManagementController';
import User from '../../models/User';
import Venue from '../../models/Venue';
import CoachDetail from '../../models/coach/CoachDetail';
import Ticket from '../../models/Ticket';

jest.mock('../../models/User');
jest.mock('../../models/Venue');
jest.mock('../../models/coach/CoachDetail');
jest.mock('../../models/Ticket');

describe('Admin Controllers - adminManagementController.ts', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    req = {} as Partial<Request>;
    res = makeRes();
    next = jest.fn() as unknown as NextFunction;
  });

  // ---------------------- HAPPY PATHS - USERS ----------------------
  describe('Happy Paths - Users', () => {
    it('should list users with pagination and search', async () => {
      const mockUsers = [{ _id: 'u1' }, { _id: 'u2' }];

      const limitMock = jest.fn().mockResolvedValue(mockUsers);
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });

      (User as any).find = jest.fn().mockReturnValue({
        select: selectMock,
      });
      (User as any).countDocuments = jest.fn().mockResolvedValue(2);

      req.query = { q: 'john', role: 'user', page: '1', limit: '10' };

      await listUsers(req as Request, res as Response, next);

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          $or: expect.any(Array),
        })
      );
      expect(selectMock).toHaveBeenCalledWith('-password');
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(skipMock).toHaveBeenCalledWith(0);
      expect(limitMock).toHaveBeenCalledWith(10);
      expect(User.countDocuments).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        total: 2,
      });
    });

    it('should get single user by id', async () => {
      const user = { _id: 'u1', username: 'John' };
      const selectMock = jest.fn().mockResolvedValue(user);
      (User as any).findById = jest.fn().mockReturnValue({
        select: selectMock,
      });

      req.params = { id: 'u1' };

      await getUserById(req as Request, res as Response, next);

      expect(User.findById).toHaveBeenCalledWith('u1');
      expect(selectMock).toHaveBeenCalledWith('-password');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: user });
    });

    it('should delete user when exists', async () => {
      const user = { _id: 'u1' };
      (User as any).findById = jest.fn().mockResolvedValue(user);
      (User as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      req.params = { id: 'u1' };

      await deleteUser(req as Request, res as Response, next);

      expect(User.findById).toHaveBeenCalledWith('u1');
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: user._id });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted',
      });
    });
  });

  // ----------------- EDGE CASES & ERRORS - USERS ------------------
  describe('Edge Cases & Error Handling - Users', () => {
    it('should return 404 when user not found in getUserById', async () => {
      const selectMock = jest.fn().mockResolvedValue(null);
      (User as any).findById = jest.fn().mockReturnValue({
        select: selectMock,
      });

      req.params = { id: 'missing-id' };

      await getUserById(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 404 when deleting non-existing user', async () => {
      (User as any).findById = jest.fn().mockResolvedValue(null);

      req.params = { id: 'missing-id' };

      await deleteUser(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });
  });

  // -------------------- HAPPY PATHS - COACHES ---------------------
  describe('Happy Paths - Coaches', () => {
    it('should list coaches with details', async () => {
      const mockUsers = [{ _id: 'c1', role: 'coach' }];
      const limitMock = jest.fn().mockResolvedValue(mockUsers);
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });

      (User as any).find = jest.fn().mockReturnValue({ select: selectMock });
      (User as any).countDocuments = jest.fn().mockResolvedValue(1);
      (CoachDetail as any).findOne = jest.fn().mockResolvedValue({ bio: 'Coach detail' });

      req.query = { q: 'coach', page: '1', limit: '10' };

      await listCoaches(req as Request, res as Response, next);

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'coach',
          $or: expect.any(Array),
        })
      );
      expect(CoachDetail.findOne).toHaveBeenCalledWith({ coachId: mockUsers[0]._id });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ user: mockUsers[0], detail: { bio: 'Coach detail' } }],
        total: 1,
      });
    });

    it('should delete coach and related coach detail', async () => {
      const coachUser = { _id: 'c1', role: 'coach' };
      (User as any).findById = jest.fn().mockResolvedValue(coachUser);
      (User as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      (CoachDetail as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      req.params = { id: 'c1' };

      await deleteCoach(req as Request, res as Response, next);

      expect(User.findById).toHaveBeenCalledWith('c1');
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: coachUser._id });
      expect(CoachDetail.deleteOne).toHaveBeenCalledWith({ coachId: coachUser._id });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Coach deleted',
      });
    });
  });

  // ---------------- EDGE CASES & ERRORS - COACHES ----------------
  describe('Edge Cases & Error Handling - Coaches', () => {
    it('should return 404 when deleting non-coach or missing user', async () => {
      const nonCoachUser = { _id: 'c1', role: 'user' };
      (User as any).findById = jest.fn().mockResolvedValue(nonCoachUser);

      req.params = { id: 'c1' };

      await deleteCoach(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Coach not found',
      });
      expect(CoachDetail.deleteOne).not.toHaveBeenCalled();
    });
  });

  // ----------------- HAPPY PATHS - VENUE OWNERS -------------------
  describe('Happy Paths - Venue Owners', () => {
    it('should list venue owners with their venues', async () => {
      const mockUsers = [{ _id: 'v1', role: 'venue-owner' }];
      const limitMock = jest.fn().mockResolvedValue(mockUsers);
      const skipMock = jest.fn().mockReturnValue({ limit: limitMock });
      const sortMock = jest.fn().mockReturnValue({ skip: skipMock });
      const selectMock = jest.fn().mockReturnValue({ sort: sortMock });

      (User as any).find = jest.fn().mockReturnValue({ select: selectMock });
      (User as any).countDocuments = jest.fn().mockResolvedValue(1);

      // IMPORTANT FIX: Venue.find must return an object with .select that returns a Promise
      (Venue as any).find = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([{ name: 'Venue 1' }]),
      });

      req.query = { q: 'owner', page: '1', limit: '10' };

      await listVenueOwners(req as Request, res as Response, next);

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'venue-owner',
          $or: expect.any(Array),
        })
      );
      expect(Venue.find).toHaveBeenCalledWith({ owner: mockUsers[0]._id });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ user: mockUsers[0], venues: [{ name: 'Venue 1' }] }],
        total: 1,
      });
    });

    it('should delete venue owner when exists and role correct', async () => {
      const owner = { _id: 'v1', role: 'venue-owner' };
      (User as any).findById = jest.fn().mockResolvedValue(owner);
      (User as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

      req.params = { id: 'v1' };

      await deleteVenueOwner(req as Request, res as Response, next);

      expect(User.findById).toHaveBeenCalledWith('v1');
      expect(User.deleteOne).toHaveBeenCalledWith({ _id: owner._id });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Venue owner deleted',
      });
    });
  });

  // ----------- EDGE CASES & ERRORS - VENUE OWNERS ----------------
  describe('Edge Cases & Error Handling - Venue Owners', () => {
    it('should return 404 when deleting non-existing venue owner', async () => {
      (User as any).findById = jest.fn().mockResolvedValue(null);

      req.params = { id: 'missing' };

      await deleteVenueOwner(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Venue owner not found',
      });
    });

    it('should return 404 when user role is not venue-owner', async () => {
      const notOwner = { _id: 'v1', role: 'user' };
      (User as any).findById = jest.fn().mockResolvedValue(notOwner);

      req.params = { id: 'v1' };

      await deleteVenueOwner(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Venue owner not found',
      });
    });
  });

  // ---------------------- HAPPY PATHS - STATS ---------------------
  describe('Happy Paths - Overview Stats', () => {
    it('should return overview stats for users, owners, coaches and tickets', async () => {
      (User as any).countDocuments = jest
        .fn()
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(3)  // totalVenueOwners
        .mockResolvedValueOnce(5); // totalCoaches

      (Ticket as any).countDocuments = jest.fn().mockResolvedValue(4); // pendingTickets

      await getOverviewStats(req as Request, res as Response, next);

      expect(User.countDocuments).toHaveBeenNthCalledWith(1, { role: { $ne: 'admin' } });
      expect(User.countDocuments).toHaveBeenNthCalledWith(2, { role: 'venue-owner' });
      expect(User.countDocuments).toHaveBeenNthCalledWith(3, { role: 'coach' });
      expect(Ticket.countDocuments).toHaveBeenCalledWith({ status: 'Open' });

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          totalUsers: 10,
          totalVenueOwners: 3,
          totalCoaches: 5,
          pendingTickets: 4,
        },
      });
    });
  });
});

//Mutation fixes

  describe('Mutation Fixes - Deep Logic Coverage', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    // Robust Mongoose Chain Mock
    // This handles: find().select().sort().skip().limit()
    const mockChain = (returnData: any) => {
      const limitFn = jest.fn().mockResolvedValue(returnData);
      const skipFn = jest.fn().mockReturnValue({ limit: limitFn });
      const sortFn = jest.fn().mockReturnValue({ skip: skipFn });
      const selectFn = jest.fn().mockReturnValue({ sort: sortFn });
      return {
        select: selectFn,
        sort: sortFn, // Expose these for expectations
        skip: skipFn,
        limit: limitFn
      };
    };

    const makeRes = () => {
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      return { status, json } as unknown as Response;
    };

    beforeEach(() => {
      jest.resetAllMocks();
      req = { query: {}, params: {} };
      res = makeRes();
      next = jest.fn() as unknown as NextFunction;

      // Default robust setup
      (User as any).find = jest.fn().mockReturnValue(mockChain([]));
      (User as any).countDocuments = jest.fn().mockResolvedValue(0);
      (Venue as any).find = jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    });

    // 1. Target: Pagination Defaults (listUsers)
    // Fixes: Mutants changing "page = 1" or "limit = 50"
    it('should use default pagination values (skip 0, limit 50) when query is empty', async () => {
      req.query = {}; // No page, no limit
      
      // Capture the chain
      const chain = mockChain([]);
      (User as any).find = jest.fn().mockReturnValue(chain);

      await listUsers(req as Request, res as Response, next);

      // Verify exact defaults
      // (1 - 1) * 50 = 0
      expect(chain.skip).toHaveBeenCalledWith(0); 
      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    // 2. Target: Regex Case Insensitivity (listUsers)
    // Fixes: Mutants removing the 'i' flag from RegExp
    it('should search users with case-insensitive Regex', async () => {
      req.query = { q: 'ADMIN' }; // Uppercase query
      
      await listUsers(req as Request, res as Response, next);

      const calls = (User as any).find.mock.calls;
      const filter = calls[0][0];
      
      // Extract regex from $or array
      const usernameRegex = filter.$or[0].username;
      
      // Assert it matches lowercase (proving 'i' flag exists)
      expect(usernameRegex.test('admin')).toBe(true);
    });

    // 3. Target: Coach Detail Cleanup Error (deleteCoach)
    // Fixes: "No Coverage" in the catch block (console.warn)
    it('should warn but not fail if deleting coach detail throws error', async () => {
      const coach = { _id: 'c1', role: 'coach' };
      (User as any).findById = jest.fn().mockResolvedValue(coach);
      (User as any).deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
      
      // Force the specific error
      (CoachDetail as any).deleteOne = jest.fn().mockRejectedValue(new Error('DB Constraint'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      req.params = { id: 'c1' };
      await deleteCoach(req as Request, res as Response, next);

      expect(User.deleteOne).toHaveBeenCalled(); // User still deleted
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to delete coach detail', 
        expect.any(Error)
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      
      consoleSpy.mockRestore();
    });

    // 4. Target: Exact Role Checking (deleteCoach)
    // Fixes: Mutants changing "user.role !== 'coach'" to "false" or "true"
    it('should return 404 if user exists but is NOT a coach', async () => {
      const user = { _id: 'u1', role: 'regular_user' }; // Wrong role
      (User as any).findById = jest.fn().mockResolvedValue(user);
      
      req.params = { id: 'u1' };
      await deleteCoach(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(User.deleteOne).not.toHaveBeenCalled();
    });

    // 5. Target: Venue Owner Role Checking (deleteVenueOwner)
    // Fixes: Mutants changing "user.role !== 'venue-owner'"
    it('should return 404 if user exists but is NOT a venue-owner', async () => {
      const user = { _id: 'u1', role: 'admin' }; // Wrong role
      (User as any).findById = jest.fn().mockResolvedValue(user);
      
      req.params = { id: 'u1' };
      await deleteVenueOwner(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(User.deleteOne).not.toHaveBeenCalled();
    });

    // 6. Target: Pagination Defaults for Coaches (listCoaches)
    // Fixes: Mutants changing defaults inside the listCoaches function specifically
    it('should use default pagination for listCoaches', async () => {
      req.query = {}; 
      const chain = mockChain([]);
      (User as any).find = jest.fn().mockReturnValue(chain);

      await listCoaches(req as Request, res as Response, next);

      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(50);
    });

    // 7. Target: Stats Query Specificity (getOverviewStats)
    // Fixes: Mutants changing $ne to $eq or status 'Open' to something else
    it('should query statistics with exact filters', async () => {
        (User as any).countDocuments = jest.fn().mockResolvedValue(0);
        (Ticket as any).countDocuments = jest.fn().mockResolvedValue(0);

        await getOverviewStats(req as Request, res as Response, next);

        // Strict check on arguments
        expect(User.countDocuments).toHaveBeenCalledWith({ role: { $ne: 'admin' } });
        expect(Ticket.countDocuments).toHaveBeenCalledWith({ status: 'Open' });
    });
  });