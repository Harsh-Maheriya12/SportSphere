import { Request, Response } from "express";
import mongoose from "mongoose";

// MOCKS
const mockGetPipelineFromNL = jest.fn();
jest.mock("../../service/aiSearchService", () => ({
  getPipelineFromNL: (...args: any[]) => mockGetPipelineFromNL(...args),
}));

// Mock Venue model aggregation
const mockAggregate = jest.fn().mockReturnValue({ exec: jest.fn() });
const mockExec = mockAggregate().exec;
mongoose.model = jest.fn().mockReturnValue({
  aggregate: mockAggregate,
});

// Import controller AFTER mocks
import { aiVenueSearch } from "../../controllers/aiVenueSearchController";

// Helper for mock Response 
const makeRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
};

describe("aiVenueSearch Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Missing Question
  it("should return 400 if no question is provided", async () => {
    const req = { body: {} } as Request;
    const res = makeRes();

    await aiVenueSearch(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "question required" });
  });

  // 2. Normal pipeline, no geoNear
  it("should run pipeline when no $geoNear stage exists", async () => {
    const req = { body: { question: "Find football venues" } } as Request;
    const res = makeRes();

    const pipeline = [{ $match: { sport: "Football" } }];
    mockGetPipelineFromNL.mockResolvedValue([...pipeline]);

    mockExec.mockResolvedValue([{ id: 1 }]);

    await aiVenueSearch(req, res);

    const finalPipeline = mockAggregate.mock.calls[0][0];

    // Should append $project & $limit
    expect(finalPipeline[1]).toEqual({ $project: { owner: 0 } });
    expect(finalPipeline[2]).toEqual({ $limit: 100 });

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 1,
      data: [{ id: 1 }],
    });
  });

  // 3. geoNear exists but NOT first. should be moved
  it("should move $geoNear to first if not at index 0", async () => {
    const req = { body: { question: "Nearby venues" } } as Request;
    const res = makeRes();

    const pipeline = [
      { $match: { city: "Delhi" } },
      { $geoNear: { near: [0, 0], distanceField: "distance" } },
      { $sort: { distance: 1 } },
    ];

    mockGetPipelineFromNL.mockResolvedValue([...pipeline]);
    mockExec.mockResolvedValue([]);

    await aiVenueSearch(req, res);

    const finalPipeline = mockAggregate.mock.calls[0][0];

    expect(finalPipeline[0]).toHaveProperty("$geoNear");  // moved to first
    expect(finalPipeline[1]).toEqual({ $match: { city: "Delhi" } }); // second
    expect(finalPipeline[2]).toEqual({ $sort: { distance: 1 } });    // third

    expect(finalPipeline[3]).toEqual({ $project: { owner: 0 } });
    expect(finalPipeline[4]).toEqual({ $limit: 100 });
  });

  // 4. geoNear already first. no movement
  it("should not move $geoNear if it is already first", async () => {
    const req = { body: { question: "Geo first" } } as Request;
    const res = makeRes();

    const pipeline = [
      { $geoNear: { near: [1, 1], distanceField: "distance" } },
      { $match: { rating: { $gte: 4 } } },
    ];

    mockGetPipelineFromNL.mockResolvedValue([...pipeline]);
    mockExec.mockResolvedValue([]);

    await aiVenueSearch(req, res);

    const finalPipeline = mockAggregate.mock.calls[0][0];

    expect(finalPipeline[0]).toHaveProperty("$geoNear"); // unchanged
    expect(finalPipeline[1]).toEqual({ $match: { rating: { $gte: 4 } } });

    expect(finalPipeline[2]).toEqual({ $project: { owner: 0 } });
    expect(finalPipeline[3]).toEqual({ $limit: 100 });
  });

  // 5. Success case with multiple results
  it("should return success = true with correct count and data", async () => {
    const req = { body: { question: "List venues" } } as Request;
    const res = makeRes();

    const pipeline = [{ $match: {} }];
    mockGetPipelineFromNL.mockResolvedValue([...pipeline]);

    mockExec.mockResolvedValue([{ _id: 1 }, { _id: 2 }]);

    await aiVenueSearch(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      count: 2,
      data: [{ _id: 1 }, { _id: 2 }],
    });
  });

  // 6. getPipelineFromNL throws 500
  it("should return 500 if getPipelineFromNL throws", async () => {
    const req = { body: { question: "Cause error" } } as Request;
    const res = makeRes();

    mockGetPipelineFromNL.mockRejectedValue(new Error("LLM failure"));

    await aiVenueSearch(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "LLM failure" });
  });

  // 7. Venue.aggregate().exec throws 500
  it("should return 500 if Venue.aggregate().exec throws", async () => {
    const req = { body: { question: "Find something" } } as Request;
    const res = makeRes();

    mockGetPipelineFromNL.mockResolvedValue([{ $match: {} }]);

    mockExec.mockRejectedValue(new Error("Aggregation error"));

    await aiVenueSearch(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Aggregation error" });
  });
});
