import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { rateVenueAfterGame, completeGame } from '../../controllers/gameControllers/postGame';
import Game from '../../models/gameModels';
import Venue from '../../models/Venue';
import AppError from '../../utils/AppError';
import { IUserRequest } from '../../middleware/authMiddleware';

// Mock the models
jest.mock('../../models/gameModels');
jest.mock('../../models/Venue');

// Mock mongoose.Types.ObjectId to return the input value as-is for testing
jest.spyOn(mongoose.Types, 'ObjectId').mockImplementation((id: any) => id as any);

describe('Post Game Controllers - postGame.ts', () => {
  let mockRequest: Partial<IUserRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(function(this: any) {
      return this;
    });
    
    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };
    
    mockRequest = {
      params: {},
      body: {},
      user: {
        _id: 'user123',
        username: 'testuser',
        email: 'user@example.com',
        role: 'player',
      } as any,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('rateVenueAfterGame', () => {
    const mockGame = {
      _id: 'game123',
      host: 'host123',
      status: 'Completed',
      approvedPlayers: ['player1', 'player2'],
      venue: {
        venueId: 'venue123',
        city: 'Test City',
        state: 'Test State',
      },
      save: jest.fn().mockResolvedValue(true),
    };

    const mockVenue = {
      _id: 'venue123',
      name: 'Test Venue',
      ratings: [] as any[],
      averageRating: 0,
      totalRatings: 0,
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockRequest.params = { gameId: 'game123' };
      mockRequest.body = { rating: 4 };
      mockRequest.user = { _id: 'user123' } as any;
      mockVenue.ratings = [];
      mockVenue.averageRating = 0;
      mockVenue.totalRatings = 0;
    });

    // Test successful rating by host
    it('should successfully rate venue by host', async () => {
      const gameAsHost = { ...mockGame, host: 'user123' };
      (Game.findById as jest.Mock).mockResolvedValue(gameAsHost);
      (Venue.findById as jest.Mock).mockResolvedValue(mockVenue);

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(Venue.findById).toHaveBeenCalledWith('venue123');
      expect(mockVenue.ratings).toHaveLength(1);
      expect(mockVenue.ratings[0].rating).toBe(4);
      expect(mockVenue.averageRating).toBe(4);
      expect(mockVenue.totalRatings).toBe(1);
      expect(mockVenue.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Thanks for rating the venue!',
        averageRating: 4,
      });
    });

    // Test successful rating by approved player
    it('should successfully rate venue by approved player', async () => {
      const gameWithPlayer = { ...mockGame, approvedPlayers: ['user123', 'player2'] };
      (Game.findById as jest.Mock).mockResolvedValue(gameWithPlayer);
      (Venue.findById as jest.Mock).mockResolvedValue(mockVenue);
      mockRequest.body.rating = 5;

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockVenue.ratings).toHaveLength(1);
      expect(mockVenue.ratings[0].rating).toBe(5);
      expect(mockVenue.averageRating).toBe(5);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Thanks for rating the venue!',
        averageRating: 5,
      });
    });

    // Test error when rating is missing
    it('should throw error when rating is missing', async () => {
      mockRequest.body = {};

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Rating must be between 1 and 5');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when rating is less than 1
    it('should throw error when rating is less than 1', async () => {
      mockRequest.body.rating = 0;

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Rating must be between 1 and 5');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when rating is greater than 5
    it('should throw error when rating is greater than 5', async () => {
      mockRequest.body.rating = 6;

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Rating must be between 1 and 5');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when game is not found
    it('should throw error when game is not found', async () => {
      (Game.findById as jest.Mock).mockResolvedValue(null);

      await rateVenueAfterGame(
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

    // Test error when game is not completed
    it('should throw error when game is not completed', async () => {
      const openGame = { ...mockGame, status: 'Open' };
      (Game.findById as jest.Mock).mockResolvedValue(openGame);

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('You can only rate after completing the game');
      expect(errorArg.statusCode).toBe(400);
    });

    // Test error when user is not host and not in approved players
    it('should throw error when user is not authorized to rate', async () => {
      const gameWithoutUser = { ...mockGame, host: 'host456', approvedPlayers: ['player1', 'player2'] };
      (Game.findById as jest.Mock).mockResolvedValue(gameWithoutUser);

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Not allowed to rate this venue');
      expect(errorArg.statusCode).toBe(403);
    });

    // Test error when venue is not found
    it('should throw error when venue is not found', async () => {
      const gameAsHost = { ...mockGame, host: 'user123' };
      (Game.findById as jest.Mock).mockResolvedValue(gameAsHost);
      (Venue.findById as jest.Mock).mockResolvedValue(null);

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      const errorArg = (mockNext as jest.Mock).mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(AppError);
      expect(errorArg.message).toBe('Venue not found');
      expect(errorArg.statusCode).toBe(404);
    });

    // Test updating existing rating
    it('should update existing rating when user has already rated', async () => {
      const gameAsHost = { ...mockGame, host: 'user123' };
      const venueWithRating = {
        ...mockVenue,
        ratings: [{ userId: 'user123', rating: 3 }],
        averageRating: 3,
        totalRatings: 1,
      };
      (Game.findById as jest.Mock).mockResolvedValue(gameAsHost);
      (Venue.findById as jest.Mock).mockResolvedValue(venueWithRating);
      mockRequest.body.rating = 5;

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(venueWithRating.ratings).toHaveLength(1);
      expect(venueWithRating.ratings[0].rating).toBe(5);
      expect(venueWithRating.averageRating).toBe(5);
      expect(venueWithRating.totalRatings).toBe(1);
      expect(venueWithRating.save).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Rating updated successfully!',
        averageRating: 5,
      });
    });

    // Test correct average calculation with multiple ratings
    it('should correctly calculate average rating with multiple ratings', async () => {
      const gameAsHost = { ...mockGame, host: 'user123' };
      const venueWithMultipleRatings = {
        ...mockVenue,
        ratings: [
          { userId: 'user1', rating: 4 },
          { userId: 'user2', rating: 5 },
        ],
        averageRating: 4.5,
        totalRatings: 2,
      };
      (Game.findById as jest.Mock).mockResolvedValue(gameAsHost);
      (Venue.findById as jest.Mock).mockResolvedValue(venueWithMultipleRatings);
      mockRequest.body.rating = 3;

      await rateVenueAfterGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(venueWithMultipleRatings.ratings).toHaveLength(3);
      expect(venueWithMultipleRatings.averageRating).toBe(4); // (4 + 5 + 3) / 3 = 4
      expect(venueWithMultipleRatings.totalRatings).toBe(3);
    });
  });

  describe('completeGame', () => {
    const mockGame = {
      _id: 'game123',
      host: 'host123',
      status: 'Open',
      slot: {
        startTime: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        endTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
      save: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      mockRequest.params = { id: 'game123' };
      mockRequest.user = { _id: 'host123' } as any;
      mockGame.status = 'Open';
      mockGame.save.mockClear();
    });

    // Test successful game completion by host
    it('should successfully complete game by host', async () => {
      (Game.findById as jest.Mock).mockResolvedValue(mockGame);

      await completeGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(mockGame.status).toBe('Completed');
      expect(mockGame.save).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Game marked as completed',
      });
    });

    // Test error when game is not found
    it('should return 404 when game is not found', async () => {
      (Game.findById as jest.Mock).mockResolvedValue(null);

      await completeGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Game not found',
      });
      expect(mockGame.save).not.toHaveBeenCalled();
    });

    // Test error when non-host tries to complete game
    it('should return 403 when non-host tries to complete game', async () => {
      const gameWithDifferentHost = { ...mockGame, host: 'otherHost' };
      (Game.findById as jest.Mock).mockResolvedValue(gameWithDifferentHost);

      await completeGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized',
      });
      expect(mockGame.save).not.toHaveBeenCalled();
    });

    // Test error when game end time has not passed
    it('should return 400 when game has not ended yet', async () => {
      const ongoingGame = {
        ...mockGame,
        slot: {
          startTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
          endTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
        },
      };
      (Game.findById as jest.Mock).mockResolvedValue(ongoingGame);

      await completeGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Game cannot be completed before it ends',
      });
      expect(mockGame.save).not.toHaveBeenCalled();
    });

    // Test completing game exactly at end time
    it('should allow completion when current time equals end time', async () => {
      const now = new Date();
      const gameAtEndTime = {
        ...mockGame,
        slot: {
          startTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          endTime: new Date(now.getTime() - 1000), // 1 second ago
        },
        save: jest.fn().mockResolvedValue(true),
      };
      (Game.findById as jest.Mock).mockResolvedValue(gameAtEndTime);

      await completeGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(gameAtEndTime.status).toBe('Completed');
      expect(gameAtEndTime.save).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Game marked as completed',
      });
    });

    // Test that function returns void
    it('should return void explicitly', async () => {
      (Game.findById as jest.Mock).mockResolvedValue(mockGame);

      const result = await completeGame(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(result).toBeUndefined();
    });
  });
});
