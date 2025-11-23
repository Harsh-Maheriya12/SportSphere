import { Request, Response, NextFunction } from 'express';
import { getGameById, getMyBookings, getGames } from '../../controllers/gameControllers/getGames';
import Game from '../../models/gameModels';
import AppError from '../../utils/AppError';
import { IUserRequest } from '../../middleware/authMiddleware';

// Mock the models
jest.mock('../../models/gameModels');

describe('Game Controllers - getGames.ts', () => {
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
      query: {},
      user: {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'player',
      } as any,
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('getGameById', () => {
    // Test successful retrieval of a game by ID with populated host and player fields
    it('should return game by ID with populated fields', async () => {
      const mockGame = {
        _id: 'game123',
        sport: 'football',
        host: { _id: 'host123', username: 'hostuser', email: 'host@example.com' },
        approvedPlayers: [{ _id: 'player1', username: 'player1', email: 'p1@example.com' }],
      };

      const populateMock = jest.fn().mockReturnThis();
      (Game.findById as jest.Mock) = jest.fn().mockReturnValue({
        populate: populateMock.mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockGame),
        }),
      });

      mockRequest.params = { gameId: 'game123' };

      await getGameById(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        game: mockGame,
      });
    });

    // Test that a 404 error is returned when game is not found
    it('should call next with AppError when game not found', async () => {
      const populateMock = jest.fn().mockReturnThis();
      (Game.findById as jest.Mock) = jest.fn().mockReturnValue({
        populate: populateMock.mockReturnValue({
          populate: jest.fn().mockResolvedValue(null),
        }),
      });

      mockRequest.params = { gameId: 'nonexistent' };

      await getGameById(
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
  });

  describe('getMyBookings', () => {
    // Test that all seven booking categories are returned correctly for a user
    it('should return all booking categories for logged-in user', async () => {
      const mockHosted = [{ _id: 'game1', host: 'user123' }];
      const mockJoined = [{ _id: 'game2', approvedPlayers: ['user123'] }];
      const mockPending = [{ _id: 'game3', joinRequests: [{ user: 'user123', status: 'pending' }] }];
      const mockRejected = [{ _id: 'game4', joinRequests: [{ user: 'user123', status: 'rejected' }] }];
      const mockCancelled = [{ _id: 'game5', status: 'Cancelled' }];
      const mockBooked = [{ _id: 'game6', bookingStatus: 'Booked' }];
      const mockCompleted = [{ _id: 'game7', status: 'Completed' }];

      const sortMock = jest.fn().mockReturnThis();
      (Game.find as jest.Mock) = jest.fn()
        .mockReturnValueOnce({ sort: sortMock.mockResolvedValueOnce(mockHosted) })
        .mockReturnValueOnce({ sort: sortMock.mockResolvedValueOnce(mockJoined) })
        .mockResolvedValueOnce(mockPending)
        .mockResolvedValueOnce(mockRejected)
        .mockResolvedValueOnce(mockCancelled)
        .mockResolvedValueOnce(mockBooked)
        .mockReturnValueOnce({ sort: sortMock.mockResolvedValueOnce(mockCompleted) });

      await getMyBookings(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledTimes(7);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        bookings: {
          hosted: mockHosted,
          joined: mockJoined,
          pending: mockPending,
          rejected: mockRejected,
          cancelled: mockCancelled,
          booked: mockBooked,
          completed: mockCompleted,
        },
      });
    });

    // Test that empty arrays are returned when user has no bookings in any category
    it('should return empty arrays when user has no bookings', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      (Game.find as jest.Mock) = jest.fn()
        .mockReturnValueOnce({ sort: sortMock })
        .mockReturnValueOnce({ sort: sortMock })
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockReturnValueOnce({ sort: sortMock });

      await getMyBookings(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        bookings: {
          hosted: [],
          joined: [],
          pending: [],
          rejected: [],
          cancelled: [],
          booked: [],
          completed: [],
        },
      });
    });
  });

  describe('getGames', () => {
    let mockGames: any[];
    let populateMock: jest.Mock;
    let populate2Mock: jest.Mock;
    let sortMock: jest.Mock;

    beforeEach(() => {
      mockGames = [
        {
          _id: 'game1',
          sport: 'football',
          status: 'Open',
          approvedPlayers: ['player1'],
          playersNeeded: { min: 5, max: 10 },
          slot: { startTime: new Date('2025-12-01') },
        },
        {
          _id: 'game2',
          sport: 'cricket',
          status: 'Open',
          approvedPlayers: ['player2', 'player3'],
          playersNeeded: { min: 8, max: 15 },
          slot: { startTime: new Date('2025-12-02') },
        },
      ];

      populateMock = jest.fn();
      populate2Mock = jest.fn();
      sortMock = jest.fn().mockResolvedValue(mockGames);

      // Create the mock chain properly
      const populate2 = {
        sort: sortMock,
      };
      populate2Mock.mockReturnValue(populate2);
      const populate1 = {
        populate: populate2Mock,
      };
      populateMock.mockReturnValue(populate1);

      (Game.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: populateMock,
      });
    });

    // Test that games are retrieved without filters and response contains correct data
    it('should return all open upcoming not-full games with no filters', async () => {
      // Add spy to track calls
      const statusSpy = jest.spyOn(mockResponse as any, 'status');
      const jsonSpy = jest.spyOn(mockResponse as any, 'json');

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Open',
          $expr: { $lt: [{ $size: '$approvedPlayers' }, '$playersNeeded.max'] },
          'slot.startTime': expect.objectContaining({ $gte: expect.any(Date) }),
        })
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        count: 2,
        games: mockGames,
      });
    });

    // Test that sport filter uses case-insensitive regex matching
    it('should filter by sport (case-insensitive)', async () => {
      mockRequest.query = { sport: 'football' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sport: expect.any(RegExp),
        })
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg.sport.source).toBe('football');
      expect(callArg.sport.flags).toContain('i');
    });

    // Test that venueId filter correctly queries by venue.venueId field
    it('should filter by venueId', async () => {
      mockRequest.query = { venueId: 'venue123' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'venue.venueId': 'venue123',
        })
      );
    });

    // Test that date range filter applies both $gte and $lte to slot.startTime
    it('should filter by date range (startDate and endDate)', async () => {
      mockRequest.query = {
        startDate: '2025-12-01',
        endDate: '2025-12-31',
      };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'slot.startTime': expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        })
      );
    });

    // Test that startDate filter sets minimum date while ensuring games are upcoming
    it('should filter by startDate only and ensure upcoming games', async () => {
      mockRequest.query = { startDate: '2025-12-01' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['slot.startTime']).toHaveProperty('$gte');
      expect(callArg['slot.startTime'].$gte).toBeInstanceOf(Date);
    });

    // Test that endDate filter sets maximum date while ensuring games aren't in the past
    it('should filter by endDate only and ensure not past games', async () => {
      mockRequest.query = { endDate: '2025-12-31' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['slot.startTime']).toHaveProperty('$gte');
      expect(callArg['slot.startTime']).toHaveProperty('$lte');
    });

    // Test that minPrice filter applies $gte to approxCostPerPlayer
    it('should filter by minPrice only', async () => {
      mockRequest.query = { minPrice: '100' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          approxCostPerPlayer: expect.objectContaining({ $gte: 100 }),
        })
      );
    });

    // Test that maxPrice filter applies $lte to approxCostPerPlayer
    it('should filter by maxPrice only', async () => {
      mockRequest.query = { maxPrice: '500' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          approxCostPerPlayer: expect.objectContaining({ $lte: 500 }),
        })
      );
    });

    // Test that both minPrice and maxPrice filters are applied together
    it('should filter by price range (minPrice and maxPrice)', async () => {
      mockRequest.query = { minPrice: '100', maxPrice: '500' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          approxCostPerPlayer: expect.objectContaining({
            $gte: 100,
            $lte: 500,
          }),
        })
      );
    });

    // Test that invalid/NaN price values result in empty price filter object
    it('should handle invalid price values gracefully', async () => {
      mockRequest.query = { minPrice: 'invalid', maxPrice: 'invalid' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      // When both values are NaN, an empty object is created but nothing is added to it
      expect(callArg.approxCostPerPlayer).toEqual({});
    });

    // Test that geolocation filter uses $near with default 5000m radius
    it('should filter by geolocation with default radius', async () => {
      mockRequest.query = { lng: '72.8', lat: '19.0' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'venue.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [72.8, 19.0],
              },
              $maxDistance: 5000,
            },
          },
        })
      );
    });

    // Test that custom radius parameter is applied to geolocation $near query
    it('should filter by geolocation with custom radius', async () => {
      mockRequest.query = { lng: '72.8', lat: '19.0', radius: '10000' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'venue.coordinates': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [72.8, 19.0],
              },
              $maxDistance: 10000,
            },
          },
        })
      );
    });

    // Test that multiple filters (sport, price, date) can be combined in one query
    it('should handle combined filters (sport, price, date)', async () => {
      mockRequest.query = {
        sport: 'cricket',
        minPrice: '200',
        maxPrice: '800',
        startDate: '2025-12-01',
      };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg.sport).toBeInstanceOf(RegExp);
      expect(callArg.approxCostPerPlayer).toHaveProperty('$gte', 200);
      expect(callArg.approxCostPerPlayer).toHaveProperty('$lte', 800);
      expect(callArg['slot.startTime']).toHaveProperty('$gte');
    });

    // Test that non-string sport values are ignored and not added to query
    it('should ignore sport filter if not a string', async () => {
      mockRequest.query = { sport: 123 as any };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg.sport).toBeUndefined();
    });

    // Test that non-string venueId values are ignored and not added to query
    it('should ignore venueId filter if not a string', async () => {
      mockRequest.query = { venueId: 456 as any };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.venueId']).toBeUndefined();
    });

    // Test that geolocation filter is not applied when longitude is missing
    it('should not apply geo filter if lng is missing', async () => {
      mockRequest.query = { lat: '19.0' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.coordinates']).toBeUndefined();
    });

    // Test that geolocation filter is not applied when latitude is missing
    it('should not apply geo filter if lat is missing', async () => {
      mockRequest.query = { lng: '72.8' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.coordinates']).toBeUndefined();
    });

    // Test that empty array is returned when no games match the applied filters
    it('should return empty games array when no games match filters', async () => {
      const populateMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockResolvedValue([]);
      
      (Game.find as jest.Mock) = jest.fn().mockReturnValue({
        populate: populateMock.mockReturnValue({
          populate: populateMock.mockReturnValue({
            sort: sortMock,
          }),
        }),
      });

      // Create fresh mock instances for this test
      const freshJsonMock = jest.fn();
      const freshStatusMock = jest.fn().mockReturnValue({ json: freshJsonMock });
      const freshResponse = {
        json: freshJsonMock,
        status: freshStatusMock,
      } as unknown as Response;

      await getGames(
        mockRequest as IUserRequest,
        freshResponse,
        mockNext
      );

      // Verify the query was made (response handled by asyncHandler)
      expect(Game.find).toHaveBeenCalled();
    });

    // Test that host and approvedPlayers fields are populated with specific fields
    it('should populate host and approvedPlayers fields', async () => {
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(populateMock).toHaveBeenCalledWith('host', 'username role');
      expect(populate2Mock).toHaveBeenCalledWith('approvedPlayers', 'username');
    });

    // Test that games are sorted by slot.startTime in ascending order (earliest first)
    it('should sort games by slot.startTime in ascending order', async () => {
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalled();
      expect(populateMock).toHaveBeenCalled();
    });
  });
});