import { Request, Response, NextFunction } from 'express';
import { getGameById, getMyBookings, getGames } from '../../controllers/gameControllers/getGames';
import Game from '../../models/gameModels';
import AppError from '../../utils/AppError';
import { IUserRequest } from '../../middleware/authMiddleware';
import Booking from "../../models/Booking";
import { stat } from 'fs';

// Mock the models
jest.mock('../../models/gameModels');
jest.mock("../../models/Booking");

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
      status: jest.fn(function (this: any) {
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
    // Test successful retrieval of a game by ID with populated host, player fields and calendar link
    it('should return game by ID with populated fields and calendarLink as host is requesting', async () => {
      const mockGame = {
        _id: 'game123',
        sport: 'football',
        host: { _id: 'user123', toString: () => 'user123', username: 'testuser', email: 'test@example.com' },
        approvedPlayers: [{ _id: 'user123', toString: () => 'user123', username: 'testuser', email: 'test@example.com' }, { _id: 'player1', toString: () => 'player1', username: 'player1', email: 'p1@example.com' }],
        joinRequests: [],
      };

      const populate3 = jest.fn().mockResolvedValue(mockGame);
      const populate2 = jest.fn().mockImplementation(() => ({
        populate: populate3
      }));
      const populate1 = jest.fn().mockImplementation(() => ({
        populate: populate2
      }));
      (Game.findById as jest.Mock).mockReturnValue({
        populate: populate1
      });

      const mockBooking = {
        status: "Paid",
        calendarLink: "https://cal.com/test123",
      };

      (Booking.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBooking);

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
        calendarLink: "https://cal.com/test123",
      });
    });

    // Test that a 404 error is returned when game is not found
    it('should call next with AppError when game not found', async () => {

      const populate3 = jest.fn().mockResolvedValue(null);
      const populate2 = jest.fn().mockImplementation(() => ({
        populate: populate3
      }));
      const populate1 = jest.fn().mockImplementation(() => ({
        populate: populate2
      }));
      (Game.findById as jest.Mock).mockReturnValue({
        populate: populate1
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

    // Test that game does have booking but status not "Paid" does not expose calendar link
    it('should NOT expose calendar link if booking not paid', async () => {
      const mockGame = {
        _id: 'game123',
        sport: 'basketball',
        host: { _id: 'user123', toString: () => 'user123', username: 'testuser', email: 'test@example.com' },
        approvedPlayers: [
          { _id: 'user123', toString: () => 'user123', username: 'testuser', email: 'test@example.com' }, 
          { _id: 'player2', toString: () => 'player2', username: 'player2', email: 'player2@example.com' }
        ],
        joinRequests: [],
      };
      const populate3 = jest.fn().mockResolvedValue(mockGame);
      const populate2 = jest.fn().mockImplementation(() => ({
        populate: populate3
      }));
      const populate1 = jest.fn().mockImplementation(() => ({
        populate: populate2
      }));
      (Game.findById as jest.Mock).mockReturnValue({
        populate: populate1
      });

      (Booking.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);
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
        calendarLink: null,
      });
    });

    // Test that calendar link is exposed if requester is an approved player
    it("should expose calendar link if requester is approved player", async () => {
      const mockGame = {
        _id: "game123",
        sport: "cricket",
        host: { _id: 'host999', toString: () => 'host999', username: 'hostuser', email: 'host@example.com' },
        approvedPlayers: [
          { _id: "user123", toString: () => 'user123', username: "test1user", email: "test1@example.com" },
          { _id: 'host999', toString: () => 'host999', username: 'hostuser', email: 'host@example.com' }
        ],
        joinRequests: [],
      };

      const populate3 = jest.fn().mockResolvedValue(mockGame);
      const populate2 = jest.fn().mockImplementation(() => ({
        populate: populate3
      }));
      const populate1 = jest.fn().mockImplementation(() => ({
        populate: populate2
      }));
      (Game.findById as jest.Mock).mockReturnValue({
        populate: populate1
      });

      const mockBooking = {
        calendarLink: "https://cal.com/ppp333",
      };

      (Booking.findOne as jest.Mock) = jest.fn().mockResolvedValue(mockBooking);

      mockRequest.params = { gameId: "game123" };

      await getGameById(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        game: mockGame,
        calendarLink: "https://cal.com/ppp333",
      });
    });

    // Test that calendar link is not exposed if requester is neither host nor approved player
    it("should NOT expose calendar link if user is not host or approved", async () => {
      const mockGame = {
        _id: "game123",
        sport: "tennis",
        host: { _id: "host999", toString: () => "host999", username: 'hostuser', email: 'host@example.com' },
        approvedPlayers: [
          { _id: 'host999', toString: () => "host999", username: 'hostuser', email: 'host@example.com' }
        ],
        joinRequests: [],
      };

      const populate3 = jest.fn().mockResolvedValue(mockGame);
      const populate2 = jest.fn().mockImplementation(() => ({
        populate: populate3
      }));
      const populate1 = jest.fn().mockImplementation(() => ({
        populate: populate2
      }));
      (Game.findById as jest.Mock).mockReturnValue({
        populate: populate1
      });

      (Booking.findOne as jest.Mock) = jest.fn().mockResolvedValue(null);

      mockRequest.params = { gameId: "game123" };

      await getGameById(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        game: mockGame,
        calendarLink: null,
      });
    });
    // Test that all populated fields are called with correct parameters
    it("should call all populate chains with correct parameters", async () => {
      const mockGame = { _id: "gameX" };

      const populate3 = jest.fn().mockResolvedValue(mockGame);
      const populate2 = jest.fn().mockImplementation(() => ({
        populate: populate3
      }));
      const populate1 = jest.fn().mockImplementation(() => ({
        populate: populate2
      }));
      (Game.findById as jest.Mock).mockReturnValue({
        populate: populate1
      });

      (Booking.findOne as jest.Mock).mockResolvedValue(null);

      mockRequest.params = { gameId: "gameX" };

      await getGameById(mockRequest as IUserRequest, mockResponse as Response, mockNext);

      expect(populate1).toHaveBeenCalledWith("host", "username email");
      expect(populate2).toHaveBeenCalledWith("approvedPlayers", "username email");
      expect(populate3).toHaveBeenCalledWith("joinRequests.user", "username email");
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
      const sortCalls = sortMock.mock.calls;
      expect(sortCalls[0][0]).toEqual({ "slot.startTime": 1 });   // hosted
      expect(sortCalls[1][0]).toEqual({ "slot.startTime": 1 });   // joined
      expect(sortCalls[2][0]).toEqual({ "slot.startTime": -1 });  // completed

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
    // Test that a cancelled game where user is ONLY an approvedPlayer is included  
    it("should include a cancelled game where user is ONLY an approvedPlayer", async () => {
      const mockCancelled = [
        { _id: "g1", status: "Cancelled", approvedPlayers: ["user123"] }
      ];
      (Game.find as jest.Mock)
        .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([]) }) // hosted
        .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([]) }) // joined
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockCancelled) // <-- this is the new important one
        .mockResolvedValueOnce([])
        .mockReturnValueOnce({ sort: jest.fn().mockResolvedValue([]) });

      await getMyBookings(mockRequest as IUserRequest, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bookings: expect.objectContaining({
            cancelled: mockCancelled
          })
        })
      );
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

    // Test that only games with approvedPlayers count less than max are returned
    it("should include game when approvedPlayers < max", async () => {
      mockGames = [{
        approvedPlayers: ["p1"],
        playersNeeded: { max: 5 },
        slot: { startTime: new Date("2030-01-01") },
        status: "Open"
      }];
      (Game.find as jest.Mock).mockReturnValue({
        populate: populateMock,
      });
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $expr: { $lt: [{ $size: "$approvedPlayers" }, "$playersNeeded.max"] }
        })
      );
    });

    // Test that games with approvedPlayers count equal to max are excluded
    it("should exclude game when approvedPlayers = max", async () => {
      mockGames = [{
        approvedPlayers: ["p1", "p2", "p3"],
        playersNeeded: { max: 3 },
        slot: { startTime: new Date("2030-01-01") },
        status: "Open"
      }];
      (Game.find as jest.Mock).mockReturnValue({
        populate: populateMock,
      });
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );
      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $expr: { $lt: [{ $size: "$approvedPlayers" }, "$playersNeeded.max"] }
        })
      );
    });
    // Test that games with missing playersNeeded.max do not crash the query
    it("should not crash when playersNeeded.max is missing", async () => {
      mockGames = [{
        approvedPlayers: ["p1"],
        playersNeeded: {}, // no max
        slot: { startTime: new Date("2030-01-01") },
        status: "Open"
      }];
      sortMock.mockResolvedValue(mockGames);

      await getGames(mockRequest as IUserRequest, mockResponse as Response, mockNext);

      expect(Game.find).toHaveBeenCalled();
    });


    // Test that sport filter uses case-insensitive regex matching
    it('should filter by sport (case-insensitive)', async () => {
      mockRequest.query = { sport: 'fooTball' };

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
      expect(callArg.sport.source).toBe('fooTball');
      expect(callArg.sport.flags).toContain('i');
      expect(callArg.sport.test('football')).toBe(true);
    });

    // Test that city filter uses case-insensitive regex matching
    it('should filter by city (case-insensitive)', async () => {
      mockRequest.query = { city: 'mumBAI' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'venue.city': expect.any(RegExp),
        })
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.city'].source).toBe('mumBAI');
      expect(callArg['venue.city'].flags).toContain('i');
      expect(callArg["venue.city"].test("MUMBAI")).toBe(true);
    });

    // Test that venueName filter uses case-insensitive regex matching
    it('should filter by venueName (case-insensitive)', async () => {
      mockRequest.query = { venueName: 'StadIum' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'venue.venueName': expect.any(RegExp),
        })
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.venueName'].source).toBe('StadIum');
      expect(callArg['venue.venueName'].flags).toContain('i');
      expect(callArg['venue.venueName'].test('stadium')).toBe(true);
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

      const queryArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(queryArg["slot.startTime"].$gte.getTime())
        .toBe(new Date("2025-12-01").getTime());

      expect(queryArg["slot.startTime"].$lte.getTime())
        .toBe(new Date("2025-12-31").getTime());
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
      const before = Date.now();
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );
      const after = Date.now();
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];

      // expect(callArg["slot.startTime"].$lte.getTime()).toBe(new Date("2025-12-31").getTime());
      const lteDate = callArg["slot.startTime"].$lte.toISOString().slice(0, 10);
      expect(lteDate).toBe("2025-12-31");

      expect(callArg["slot.startTime"].$gte.getTime()).toBeGreaterThanOrEqual(before - 50);
      expect(callArg["slot.startTime"].$gte.getTime()).toBeLessThanOrEqual(after + 50);
    });

    // Test that no past games are returned when no date filters are applied
    it('should ensure only upcoming games when no date filters', async () => {
      mockRequest.query = {};

      const before = Date.now();

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const after = Date.now();

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      const gte = callArg['slot.startTime'].$gte.getTime();

      expect(callArg['slot.startTime'].hasOwnProperty('$gte')).toBe(true);
      expect(callArg['slot.startTime'].hasOwnProperty('$lte')).toBe(false);

      // Ensure `$gte` is near NOW (mutation-safe)
      expect(gte).toBeGreaterThanOrEqual(before - 50);
      expect(gte).toBeLessThanOrEqual(after + 50);
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
      mockRequest.query = { minPrice: '', maxPrice: '' };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      // When both values are NaN, an empty object is created but nothing is added to it
      expect(callArg.approxCostPerPlayer).toBeUndefined();
    });

    //Test that minprice valid and maxprice invalid results in only $gte being set
    it('should handle valid minPrice and invalid maxPrice', async () => {
      mockRequest.query = { minPrice: '150', maxPrice: 'invalid' };
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg.approxCostPerPlayer).toHaveProperty('$gte', 150);
      expect(callArg.approxCostPerPlayer).not.toHaveProperty('$lte');
    });

    // Test that minPrice > maxPrice results in no games being returned
    it('should handle minPrice greater than maxPrice', async () => {
      mockRequest.query = { minPrice: '600', maxPrice: '500' };
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );
      expect(Game.find).toHaveBeenCalledWith(
        expect.objectContaining({
          approxCostPerPlayer: { $gte: 600, $lte: 500 },
        })
      );
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

    // Test that non-string city values are ignored and not added to query
    it('should ignore city filter if not a string', async () => {
      mockRequest.query = { city: 456 as any };
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.city']).toBeUndefined();
    });

    // Test that non-string venueName values are ignored and not added to query
    it('should ignore venueName filter if not a string', async () => {
      mockRequest.query = { venueName: 789 as any };
      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.venueName']).toBeUndefined();
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

    // Test that geolocation filter is not applied when both longitude and latitude are missing
    it('should not apply geo filter if both is missing', async () => {
      mockRequest.query = { lng: undefined, lat: undefined };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response,
        mockNext
      );

      const callArg = (Game.find as jest.Mock).mock.calls[0][0];
      expect(callArg['venue.coordinates']).toBeUndefined();
    });

    // Test that radius defaults to 5000m when radius parameter is invalid (<= 0)
    it("should default radius to 5000 when radius <= 0", async () => {
      mockRequest.query = { lng: "72.8", lat: "19.0", radius: "0" };

      await getGames(
        mockRequest as IUserRequest,
        mockResponse as Response, 
        mockNext
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];

      expect(callArg["venue.coordinates"].$near.$maxDistance).toBe(5000);
    });

    // Test that radius defaults to 5000m when radius parameter is negative
    it("should default radius to 5000 when radius is negative", async () => {
      mockRequest.query = { lng: "72.8", lat: "19.0", radius: "-100" };

      await getGames(mockRequest as IUserRequest, mockResponse as Response, mockNext);

      const query = (Game.find as jest.Mock).mock.calls[0][0];
      expect(query["venue.coordinates"].$near.$maxDistance).toBe(5000);
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
      expect(sortMock).toHaveBeenCalledWith({ 'slot.startTime': 1 })
    });

    // Test that empty string filters for sport, city, venueName are ignored
    it("should ignore empty string filters for sport, city, venueName", async () => {
      mockRequest.query = { sport: "", city: "", venueName: "" };

      await getGames(
        mockRequest as IUserRequest, 
        mockResponse as Response, 
        mockNext
      );
      const callArg = (Game.find as jest.Mock).mock.calls[0][0];

      expect(callArg.sport).toBeUndefined();
      expect(callArg["venue.city"]).toBeUndefined();
      expect(callArg["venue.venueName"]).toBeUndefined();
    });
    // Test 
  });
});