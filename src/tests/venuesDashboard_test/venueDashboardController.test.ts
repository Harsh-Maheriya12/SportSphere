import mongoose from "mongoose";
import { Request, Response } from "express";

// ---- Mocks for Mongoose Models & Groq ----

// keep separate mocks so we can control return values per test
const mockVenueFindById = jest.fn();
const mockBookingFind = jest.fn();
const mockBookingAggregate = jest.fn();
const mockGameCountDocuments = jest.fn();
const mockGroqCreate = jest.fn();

// Mock Venue model
jest.mock("../../models/Venue", () => ({
  __esModule: true,
  default: {
    findById: mockVenueFindById,
  },
}));

// Mock Booking model
jest.mock("../../models/Booking", () => ({
  __esModule: true,
  default: {
    find: mockBookingFind,
    aggregate: mockBookingAggregate,
  },
}));

// Mock Game model
jest.mock("../../models/gameModels", () => ({
  __esModule: true,
  default: {
    countDocuments: mockGameCountDocuments,
  },
}));

// Mock Groq SDK
jest.mock("groq-sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockGroqCreate,
      },
    },
  })),
}));

// Import the controller "after" mocks above
import { getVenueOwnerDashboard } from "../../controllers/venueDashboardController";

describe("getVenueOwnerDashboard", () => {
  const makeRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res as Response);
    res.json = jest.fn().mockReturnValue(res as Response);
    return res as Response & {
      status: jest.Mock;
      json: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 for invalid venueId", async () => {
    const req = {
      params: { venueId: "not-a-valid-id" },
    } as unknown as Request;

    const res = makeRes();

    await getVenueOwnerDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid venue ID" });
  });

  it("should return 401 if user is not authenticated", async () => {
    const venueId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { venueId },
      // no user
    } as unknown as Request;

    const res = makeRes();

    await getVenueOwnerDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("should return 404 if venue not found", async () => {
    const venueId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId();

    mockVenueFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    const req = {
      params: { venueId },
      user: { _id: userId, role: "venueOwner" },
    } as unknown as Request;

    const res = makeRes();

    await getVenueOwnerDashboard(req, res);

    expect(mockVenueFindById).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Venue not found" });
  });

  it("should return 403 if user is not owner or admin", async () => {
    const venueId = new mongoose.Types.ObjectId().toString();
    const ownerId = new mongoose.Types.ObjectId();
    const otherUserId = new mongoose.Types.ObjectId();

    const venueDoc = {
      _id: new mongoose.Types.ObjectId(venueId),
      name: "Test Arena",
      city: "Ahmedabad",
      sports: ["Cricket"],
      owner: ownerId,
      averageRating: 4.2,
      totalRatings: 10,
    };

    mockVenueFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(venueDoc),
    });

    const req = {
      params: { venueId },
      user: { _id: otherUserId, role: "venueOwner" },
    } as unknown as Request;

    const res = makeRes();

    await getVenueOwnerDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("should return 500 if Groq LLM returns invalid JSON", async () => {
    const venueId = new mongoose.Types.ObjectId().toString();
    const ownerId = new mongoose.Types.ObjectId();

    const venueDoc = {
      _id: new mongoose.Types.ObjectId(venueId),
      name: "Test Arena",
      city: "Ahmedabad",
      sports: ["Cricket"],
      owner: ownerId,
      averageRating: 4.5,
      totalRatings: 20,
    };

    mockVenueFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(venueDoc),
    });

    // Mock bookings for KPIs
    const bookingDocs = [
      {
        amount: 1000,
        user: new mongoose.Types.ObjectId(),
        sport: "Cricket",
        startTime: new Date(),
        createdAt: new Date(),
      },
    ];

    mockBookingFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue(bookingDocs),
    });

    // 5 aggregate calls in the controller
    mockBookingAggregate
      .mockResolvedValueOnce([
        { _id: { year: 2025, month: 11 }, totalRevenue: 1000, bookings: 1 },
      ]) // revenueByMonth
      .mockResolvedValueOnce([{ _id: 2, bookings: 1 }]) // bookingsByDow
      .mockResolvedValueOnce([
        { _id: "Cricket", bookings: 1, revenue: 1000 },
      ]) // sportsBreakdown
      .mockResolvedValueOnce([
        { _id: bookingDocs[0].user.toString(), bookings: 1 },
      ]) // repeatCustomersAgg
      .mockResolvedValueOnce([{ totalRevenue: 500 }]); // prevRevenueAgg

    mockGameCountDocuments.mockResolvedValue(2);

    // Groq returns non-JSON text
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "This is not valid JSON at all.",
          },
        },
      ],
    });

    const req = {
      params: { venueId },
      query: { rangeDays: "90" },
      user: { _id: ownerId, role: "venueOwner" },
    } as unknown as Request;

    const res = makeRes();

    await getVenueOwnerDashboard(req, res);

    expect(mockGroqCreate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    const jsonArg = (res.json as jest.Mock).mock.calls[0][0];
    expect(jsonArg.message).toBe("LLM failed to produce valid JSON");
    expect(jsonArg.debug).toBeDefined();
  });

  it("should return 200 with computed dashboard + AI insights (happy path)", async () => {
    const venueId = new mongoose.Types.ObjectId().toString();
    const ownerId = new mongoose.Types.ObjectId();

    const venueDoc = {
      _id: new mongoose.Types.ObjectId(venueId),
      name: "Test Arena",
      city: "Ahmedabad",
      sports: ["Cricket", "Football"],
      owner: ownerId,
      averageRating: 4.5,
      totalRatings: 20,
    };

    mockVenueFindById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(venueDoc),
    });

    const now = new Date();

    const bookingDocs = [
      {
        amount: 1000,
        user: new mongoose.Types.ObjectId(),
        sport: "Cricket",
        startTime: now,
        createdAt: now,
      },
      {
        amount: 500,
        user: new mongoose.Types.ObjectId(),
        sport: "Football",
        startTime: now,
        createdAt: now,
      },
    ];

    mockBookingFind.mockReturnValue({
      lean: jest.fn().mockResolvedValue(bookingDocs),
    });

    // Aggregates: 5 calls again
    mockBookingAggregate
      .mockResolvedValueOnce([
        {
          _id: { year: 2025, month: 11 },
          totalRevenue: 1500,
          bookings: 2,
        },
      ]) // revenueByMonth
      .mockResolvedValueOnce([
        { _id: 2, bookings: 1 },
        { _id: 3, bookings: 1 },
      ]) // bookingsByDow
      .mockResolvedValueOnce([
        { _id: "Cricket", bookings: 1, revenue: 1000 },
        { _id: "Football", bookings: 1, revenue: 500 },
      ]) // sportsBreakdown
      .mockResolvedValueOnce([
        { _id: bookingDocs[0].user.toString(), bookings: 1 },
        { _id: bookingDocs[1].user.toString(), bookings: 1 },
      ]) // repeatCustomersAgg
      .mockResolvedValueOnce([{ totalRevenue: 1000 }]); // prevRevenueAgg

    mockGameCountDocuments.mockResolvedValue(3);

    // Groq returns valid strict JSON
    const aiPayload = {
      insights: [
        {
          title: "Revenue is growing",
          detail: "Revenue increased by 50% vs previous period.",
          priority: "high",
        },
        {
          title: "Cricket is top sport",
          detail: "Cricket generates most bookings.",
          priority: "medium",
        },
      ],
      summary: "The venue is performing well with increasing revenue.",
      confidence: 0.9,
    };

    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(aiPayload),
          },
        },
      ],
    });

    const req = {
      params: { venueId },
      query: { rangeDays: "90" },
      user: { _id: ownerId, role: "venueOwner" },
    } as unknown as Request;

    const res = makeRes();

    await getVenueOwnerDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const json = (res.json as jest.Mock).mock.calls[0][0];

    // Check some key fields
    expect(json.venue).toEqual({
      id: venueDoc._id.toString(),
      name: venueDoc.name,
      city: venueDoc.city,
      sports: venueDoc.sports,
    });

    expect(json.kpis.totalBookings).toBe(2);
    expect(json.kpis.totalRevenue).toBe(1500);
    expect(json.kpis.avgTicketSize).toBeCloseTo(750);

    expect(json.aiInsights).toEqual(aiPayload.insights);
    expect(json.summary).toBe(aiPayload.summary);
    expect(json.confidence).toBe(aiPayload.confidence);
  });

  it("should set revenueChangePercent = 0 when previous revenue is 0", async () => {
      const venueId = new mongoose.Types.ObjectId().toString();
      const ownerId = new mongoose.Types.ObjectId();
    
      const venueDoc = {
        _id: new mongoose.Types.ObjectId(venueId),
        name: "ZeroPrevVenue",
        city: "Delhi",
        sports: ["Tennis"],
        owner: ownerId,
        averageRating: 4.1,
        totalRatings: 5,
      };
    
      mockVenueFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(venueDoc),
      });
    
      const now = new Date();
      const bookingDocs = [
        {
          amount: 800,
          user: new mongoose.Types.ObjectId(),
          sport: "Tennis",
          startTime: now,
          createdAt: now,
        },
      ];
    
      mockBookingFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue(bookingDocs),
      });
    
      mockBookingAggregate
        .mockResolvedValueOnce([
          { _id: { year: 2025, month: 11 }, totalRevenue: 800, bookings: 1 },
        ])
        .mockResolvedValueOnce([{ _id: 3, bookings: 1 }])
        .mockResolvedValueOnce([{ _id: "Tennis", bookings: 1, revenue: 800 }])
        .mockResolvedValueOnce([
          { _id: bookingDocs[0].user.toString(), bookings: 1 },
        ])
        .mockResolvedValueOnce([{ totalRevenue: 0 }]);
    
      mockGameCountDocuments.mockResolvedValue(1);
    
      mockGroqCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                insights: [],
                summary: "Ok",
                confidence: 0.9,
              }),
            },
          },
        ],
      });
    
      const req = {
        params: { venueId },
        query: { rangeDays: "30" },
        user: { _id: ownerId, role: "venueOwner" },
      } as unknown as Request;
    
      const res = makeRes();
    
      await getVenueOwnerDashboard(req, res);
    
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json.mock.calls[0][0].revenueChangePercent).toBe(0);
    });
    it("should handle case when there are no bookings", async () => {
      const venueId = new mongoose.Types.ObjectId().toString();
      const ownerId = new mongoose.Types.ObjectId();
    
      const venueDoc = {
        _id: new mongoose.Types.ObjectId(venueId),
        name: "EmptyVenue",
        city: "Mumbai",
        sports: ["Badminton"],
        owner: ownerId,
        averageRating: 0,
        totalRatings: 0,
      };
    
      mockVenueFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(venueDoc),
      });
    
      mockBookingFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
    
      mockBookingAggregate
        .mockResolvedValueOnce([]) 
        .mockResolvedValueOnce([]) 
        .mockResolvedValueOnce([]) 
        .mockResolvedValueOnce([]) 
        .mockResolvedValueOnce([{ totalRevenue: 0 }]);
    
      mockGameCountDocuments.mockResolvedValue(0);
    
      mockGroqCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                insights: [],
                summary: "No data available",
                confidence: 0.7,
              }),
            },
          },
        ],
      });
    
      const req = {
        params: { venueId },
        query: { rangeDays: "30" },
        user: { _id: ownerId, role: "venueOwner" },
      } as unknown as Request;
    
      const res = makeRes();
    
      await getVenueOwnerDashboard(req, res);
    
      const out = res.json.mock.calls[0][0];
    
      expect(out.kpis.totalBookings).toBe(0);
      expect(out.kpis.totalRevenue).toBe(0);
      expect(out.kpis.avgTicketSize).toBe(0);
      expect(out.kpis.uniqueCustomers).toBe(0);
      expect(out.kpis.repeatCustomers).toBe(0);
      expect(out.kpis.repeatCustomerRate).toBe(0);
    });
    
    it("should successfully extract JSON even when Groq returns text around JSON", async () => {
      const venueId = new mongoose.Types.ObjectId().toString();
      const ownerId = new mongoose.Types.ObjectId();
    
      const venueDoc = {
        _id: new mongoose.Types.ObjectId(venueId),
        name: "WrappedJsonVenue",
        city: "Pune",
        sports: ["Football"],
        owner: ownerId,
        averageRating: 4,
        totalRatings: 5,
      };
    
      mockVenueFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(venueDoc),
      });
    
      const now = new Date();
      mockBookingFind.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            amount: 500,
            user: new mongoose.Types.ObjectId(),
            sport: "Football",
            startTime: now,
            createdAt: now,
          },
        ]),
      });
    
      mockBookingAggregate
        .mockResolvedValueOnce([
          { _id: { year: 2025, month: 11 }, totalRevenue: 500, bookings: 1 },
        ])
        .mockResolvedValueOnce([{ _id: 4, bookings: 1 }])
        .mockResolvedValueOnce([{ _id: "Football", bookings: 1, revenue: 500 }])
        .mockResolvedValueOnce([
          { _id: "u1", bookings: 1 },
        ])
        .mockResolvedValueOnce([{ totalRevenue: 500 }]);
    
      mockGameCountDocuments.mockResolvedValue(1);
    
      const wrappedJson = `
        Some header text...
        {"insights":[{"title":"OK","detail":"Fine","priority":"low"}],"summary":"Good","confidence":0.8}
        Some footer text...
      `;
    
      mockGroqCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: wrappedJson,
            },
          },
        ],
      });
    
      const req = {
        params: { venueId },
        query: { rangeDays: "30" },
        user: { _id: ownerId, role: "venueOwner" },
      } as unknown as Request;
    
      const res = makeRes();
    
      await getVenueOwnerDashboard(req, res);
    
      const out = res.json.mock.calls[0][0];
    
      expect(out.aiInsights.length).toBe(1);
      expect(out.summary).toBe("Good");
      expect(out.confidence).toBe(0.8);
    });
    
});

