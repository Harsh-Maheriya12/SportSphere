import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { 
  createJoinRequest,
  approveJoinRequest, 
  rejectJoinRequest, 
  cancelJoinRequest 
} from '../../controllers/gameControllers/joinRequestController';
import Game from '../../models/gameModels';
import AppError from '../../utils/AppError';
import { IUserRequest } from '../../middleware/authMiddleware';
import { checkNoTimeOverlapForUser } from '../../utils/checkNoTimeOverlapForUser';

// Mock the models and utilities
jest.mock('../../models/gameModels');
jest.mock('../../utils/checkNoTimeOverlapForUser');

// Mock mongoose.Types.ObjectId to return the input value as-is for testing
jest.spyOn(mongoose.Types, 'ObjectId').mockImplementation((id: any) => id as any);

describe('Join Request Controllers - joinRequestController.ts', () => {
  let mockRequest: Partial<IUserRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    
    mockResponse = {
      json: jsonMock,
      status: jest.fn(function(this: any) {
        return this;
      }),
    };
    
    statusMock = mockResponse.status as jest.Mock;
    
    mockRequest = {
      params: {},
      body: {},
      user: {
        _id: 'player123',
        username: 'testplayer',
        email: 'player@example.com',
        role: 'player',
      } as any,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
    (checkNoTimeOverlapForUser as jest.Mock).mockResolvedValue(undefined);
  });

  describe('createJoinRequest', () => {
    const mockGame = {
      _id: 'game123',
      host: 'host123',
      status: 'Open',
      slot: {
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
      },
      joinRequests: [],
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockRequest.params = { gameId: 'game123' };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(mockGame);
      mockGame.joinRequests = [];
      mockGame.save.mockClear();
    });

    // Test successful creation of join request
    it('should successfully create a join request', async () => {
      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(checkNoTimeOverlapForUser).toHaveBeenCalledWith(
        'player123',
        mockGame.slot.startTime,
        mockGame.slot.endTime
      );
      expect(mockGame.joinRequests).toHaveLength(1);
      expect(mockGame.joinRequests[0]).toMatchObject({
        user: 'player123',
        status: 'pending',
      });
      expect(mockGame.save).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Join request created',
      });
    });

    // Test error when game is not found
    it('should throw error when game is not found', async () => {
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Game not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test error when host tries to join their own game
    it('should throw error when host tries to join their own game', async () => {
      const gameWithHostAsUser = { ...mockGame, host: 'player123' };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithHostAsUser);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Host cannot join their own game');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when game status is not Open
    it('should throw error when game is not open', async () => {
      const closedGame = { ...mockGame, status: 'Cancelled' };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(closedGame);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot join a closed/cancelled game');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when game has already started
    it('should throw error when game has already started', async () => {
      const startedGame = {
        ...mockGame,
        slot: {
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          endTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
        },
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(startedGame);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Game already started');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when join request is already pending
    it('should throw error when join request is already pending', async () => {
      const gameWithPending = {
        ...mockGame,
        joinRequests: [{ user: 'player123', status: 'pending' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithPending);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Join request already pending');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when player is already approved
    it('should throw error when player is already approved', async () => {
      const gameWithApproved = {
        ...mockGame,
        joinRequests: [{ user: 'player123', status: 'approved' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithApproved);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Already approved for this game');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when join request was previously rejected
    it('should throw error when join request was previously rejected', async () => {
      const gameWithRejected = {
        ...mockGame,
        joinRequests: [{ user: 'player123', status: 'rejected' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithRejected);

      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Join request was rejected previously');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test that time overlap check is performed
    it('should check for time overlap before creating join request', async () => {
      await createJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(checkNoTimeOverlapForUser).toHaveBeenCalledWith(
        'player123',
        mockGame.slot.startTime,
        mockGame.slot.endTime
      );
    });
  });

  describe('approveJoinRequest', () => {
    const mockGame = {
      _id: 'game123',
      host: 'host123',
      status: 'Open',
      slot: {
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
      },
      joinRequests: [{ user: 'player456', status: 'pending' }],
      approvedPlayers: ['host123'],
      playersNeeded: { min: 5, max: 10 },
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockRequest.params = { gameId: 'game123', playerId: 'player456' };
      mockRequest.user = { _id: 'host123' } as any;
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(mockGame);
      mockGame.joinRequests = [{ user: 'player456', status: 'pending' }];
      mockGame.approvedPlayers = ['host123'];
      mockGame.status = 'Open';
      mockGame.save.mockClear();
    });

    // Test successful approval of join request
    it('should successfully approve a join request', async () => {
      const mockJoinRequest = { user: 'player456', status: 'pending' };
      const mockApprovedPlayers: any[] = ['host123'];
      const freshGame = {
        _id: 'game123',
        host: 'host123',
        status: 'Open',
        slot: {
          startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
        },
        joinRequests: [mockJoinRequest],
        approvedPlayers: mockApprovedPlayers,
        playersNeeded: { min: 2, max: 10 },
        save: jest.fn().mockResolvedValue(true),
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(freshGame);
      (checkNoTimeOverlapForUser as jest.Mock).mockResolvedValue(undefined);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(mockJoinRequest.status).toBe('approved');
      expect(mockApprovedPlayers).toHaveLength(2);
      expect(freshGame.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Player approved',
        currentApprovedPlayers: 2,
        status: 'Open',
      });
    });

    // Test error when game is not found
    it('should throw error when game is not found', async () => {
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Game not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test error when non-host tries to approve
    it('should throw error when non-host tries to approve', async () => {
      mockRequest.user = { _id: 'nothost' } as any;

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Only host can approve join requests');
      expect(errorArg.statusCode).toBe(403);
    });

    // Test error when game is not open
    it('should throw error when game is not open', async () => {
      const closedGame = { ...mockGame, status: 'Cancelled' };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(closedGame);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot approve join requests for closed/cancelled/completed games');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when game has already started
    it('should throw error when game has already started', async () => {
      const startedGame = {
        ...mockGame,
        slot: {
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
        },
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(startedGame);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot approve join requests for games that have already started');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when join request is not found
    it('should throw error when join request is not found', async () => {
      mockRequest.params = { gameId: 'game123', playerId: 'nonexistent' };

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Join request not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test error when join request is not pending
    it('should throw error when join request is not pending', async () => {
      const gameWithApproved = {
        ...mockGame,
        joinRequests: [{ user: 'player456', status: 'approved' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithApproved);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Already processed join request');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when game is already full
    it('should throw error when game is already full', async () => {
      const fullGame = {
        ...mockGame,
        approvedPlayers: Array(10).fill('player'),
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(fullGame);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Game is already full');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test that game status changes to Full when capacity reached
    it('should change game status to Full when capacity reached', async () => {
      const mockJoinRequest = { user: 'player456', status: 'pending' };
      const mockApprovedPlayers: any[] = Array(9).fill('player');
      const nearFullGame = {
        _id: 'game123',
        host: 'host123',
        status: 'Open',
        slot: {
          startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
        },
        approvedPlayers: mockApprovedPlayers,
        joinRequests: [mockJoinRequest],
        playersNeeded: { min: 5, max: 10 },
        save: jest.fn().mockResolvedValue(true),
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(nearFullGame);
      (checkNoTimeOverlapForUser as jest.Mock).mockResolvedValue(undefined);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(nearFullGame.status).toBe('Full');
      expect(mockApprovedPlayers).toHaveLength(10);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Full',
          currentApprovedPlayers: 10,
        })
      );
    });

    // Test that player is not added twice if already in approvedPlayers
    it('should not add player twice if already in approvedPlayers', async () => {
      const gameWithPlayerAlready = {
        ...mockGame,
        approvedPlayers: ['host123', 'player456'],
        joinRequests: [{ user: 'player456', status: 'pending' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithPlayerAlready);

      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(gameWithPlayerAlready.approvedPlayers).toHaveLength(2);
    });

    // Test that time overlap check is performed for the player
    it('should check for time overlap for the player being approved', async () => {
      await approveJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(checkNoTimeOverlapForUser).toHaveBeenCalledWith(
        'player456',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('rejectJoinRequest', () => {
    const mockGame = {
      _id: 'game123',
      host: 'host123',
      status: 'Open',
      joinRequests: [{ user: 'player456', status: 'pending' }],
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockRequest.params = { gameId: 'game123', playerId: 'player456' };
      mockRequest.user = { _id: 'host123' } as any;
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(mockGame);
      mockGame.joinRequests = [{ user: 'player456', status: 'pending' }];
      mockGame.save.mockClear();
    });

    // Test successful rejection of join request
    it('should successfully reject a join request', async () => {
      await rejectJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(mockGame.joinRequests[0].status).toBe('rejected');
      expect(mockGame.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Join request rejected',
      });
    });

    // Test error when game is not found
    it('should throw error when game is not found', async () => {
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await rejectJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Game not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test error when non-host tries to reject
    it('should throw error when non-host tries to reject', async () => {
      mockRequest.user = { _id: 'nothost' } as any;

      await rejectJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Only host can reject join requests');
      expect(errorArg.statusCode).toBe(403);
    });

    // Test error when game is not open
    it('should throw error when game is not open', async () => {
      const closedGame = { ...mockGame, status: 'Completed' };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(closedGame);

      await rejectJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot reject join requests for closed/cancelled/completed games');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when join request is not found
    it('should throw error when join request is not found', async () => {
      mockRequest.params = { gameId: 'game123', playerId: 'nonexistent' };

      await rejectJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Join request not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test error when join request is not pending
    it('should throw error when join request is not pending', async () => {
      const gameWithRejected = {
        ...mockGame,
        joinRequests: [{ user: 'player456', status: 'rejected' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithRejected);

      await rejectJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Already processed join request');
      expect(errorArg.statusCode).toBe(400);
    });
  });

  describe('cancelJoinRequest', () => {
    const mockGame = {
      _id: 'game123',
      host: 'host123',
      slot: {
        startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
      },
      joinRequests: [{ user: 'player123', status: 'pending' }],
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockRequest.params = { gameId: 'game123' };
      mockRequest.user = { _id: 'player123' } as any;
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(mockGame);
      mockGame.joinRequests = [{ user: 'player123', status: 'pending' }];
      mockGame.save.mockClear();
    });

    // Test successful cancellation of join request
    it('should successfully cancel a join request', async () => {
      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(mockGame.joinRequests).toHaveLength(0);
      expect(mockGame.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Join request cancelled',
      });
    });

    // Test error when game is not found
    it('should throw error when game is not found', async () => {
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(null);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Game not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test error when no join request found for user
    it('should throw error when no join request found', async () => {
      const gameWithoutRequest = { ...mockGame, joinRequests: [] };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithoutRequest);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('No join request found');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when trying to cancel non-pending request
    it('should throw error when trying to cancel approved request', async () => {
      const gameWithApproved = {
        ...mockGame,
        joinRequests: [{ user: 'player123', status: 'approved' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithApproved);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot cancel approved join request');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when trying to cancel rejected request
    it('should throw error when trying to cancel rejected request', async () => {
      const gameWithRejected = {
        ...mockGame,
        joinRequests: [{ user: 'player123', status: 'rejected' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithRejected);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot cancel rejected join request');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when trying to cancel less than 2 hours before start
    it('should throw error when cancelling less than 2 hours before game start', async () => {
      const soonGame = {
        ...mockGame,
        slot: {
          startTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        },
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(soonGame);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Cannot cancel join request less than 2 hours before game start');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test successful cancellation exactly 2 hours before start
    it('should allow cancellation exactly 2 hours before game start', async () => {
      const exactlyTwoHours = {
        ...mockGame,
        slot: {
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
        joinRequests: [{ user: 'player123', status: 'pending' }],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(exactlyTwoHours);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockGame.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Join request cancelled',
      });
    });

    // Test that join request is removed from array
    it('should remove join request from joinRequests array', async () => {
      const gameWithMultiple = {
        ...mockGame,
        joinRequests: [
          { user: 'player123', status: 'pending' },
          { user: 'player456', status: 'pending' },
        ],
      };
      (Game.findById as jest.Mock) = jest.fn().mockResolvedValue(gameWithMultiple);

      await cancelJoinRequest(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(gameWithMultiple.joinRequests).toHaveLength(1);
      expect(gameWithMultiple.joinRequests[0].user).toBe('player456');
    });
  });
});
