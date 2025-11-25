import mongoose from "mongoose";
import { Request, Response } from "express";
import { MongoMemoryServer } from "mongodb-memory-server";
import Venue from "../../models/Venue";
import SubVenue from "../../models/SubVenue";
import TimeSlot from "../../models/TimeSlot";
import {
  generateTimeSlots,
  getSlotsForSubVenueDate,
  updateSlotById,
  deleteSlotsForDate
} from "../../controllers/timeslotController";

jest.setTimeout(20000);

let mongoServer: MongoMemoryServer;

describe("TimeSlot Controller", () => {

  let subVenueId: mongoose.Types.ObjectId;
  const mockUserId = new mongoose.Types.ObjectId();

  // Helper to quickly mock req object
  const mockReq = (body: any = {}, params: any = {}): any => ({
    body,
    params,
    query: {},
  });


  const mockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Venue.deleteMany({});
    await SubVenue.deleteMany({});
    await TimeSlot.deleteMany({});

    // Create a minimal valid structure for slot testing
    const venue = await Venue.create({
      name: "Slot Venue",
      address: "Addr",
      city: "City",
      location: { coordinates: [1, 2] },
      owner: mockUserId
    });

    const subVenue = await SubVenue.create({
      venue: venue._id,
      name: "Court A",
      sports: [{ name: "cricket", minPlayers: 2, maxPlayers: 10 }]
    });

    subVenueId = subVenue._id as mongoose.Types.ObjectId;
  });

  // generate slots

  it("generates 24 slots for valid subVenue and date", async () => {
    const req = mockReq({
      subVenue: subVenueId,
      date: "2025-01-01"
    });

    const res = mockRes();
    await generateTimeSlots(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("rejects slot generation when date format is invalid", async () => {
    const req = mockReq({ subVenue: subVenueId, date: "01-01-2025" });
    const res = mockRes();

    await generateTimeSlots(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("prevents duplicate generation for the same subVenue and date", async () => {
    await TimeSlot.create({ subVenue: subVenueId, date: "2025-02-02", slots: [] });

    const req = mockReq({ subVenue: subVenueId, date: "2025-02-02" });
    const res = mockRes();

    await generateTimeSlots(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  // get slots

  it("returns slots for an existing date", async () => {
    await TimeSlot.create({ subVenue: subVenueId, date: "2025-03-01", slots: [] });

    const req = mockReq({}, { subVenueId });
    req.query = { date: "2025-03-01" };
    const res = mockRes();

    await getSlotsForSubVenueDate(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns empty list when no slots exist for the date", async () => {
    const req = mockReq({}, { subVenueId });
    req.query = { date: "2025-04-01" };
    const res = mockRes();

    await getSlotsForSubVenueDate(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // update slot

  it("updates slot pricing and status correctly", async () => {
    const ts = await TimeSlot.create({ subVenue: subVenueId, date: "2025-05-01", slots: [{
      startTime: new Date(),
      endTime: new Date(),
      prices: {},
      status: "blocked",
      bookedForSport: null
    }]});

    const slotId = ts.slots[0]._id;

    const req = mockReq({
      prices: { cricket: 500 },
      status: "available"
    }, { slotId });

    const res = mockRes();
    await updateSlotById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects update if invalid sport is used", async () => {
    const ts = await TimeSlot.create({ subVenue: subVenueId, date: "2025-06-01", slots: [{
      startTime: new Date(),
      endTime: new Date(),
      prices: {},
      status: "blocked",
      bookedForSport: null
    }]});

    const slotId = ts.slots[0]._id;

    const req = mockReq({ prices: { football: 400 } }, { slotId });
    const res = mockRes();

    await updateSlotById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("blocks attempts to modify slot timing", async () => {
    const ts = await TimeSlot.create({ subVenue: subVenueId, date: "2025-07-01", slots: [{
      startTime: new Date(),
      endTime: new Date(),
      prices: {},
      status: "blocked",
      bookedForSport: null
    }]});

    const slotId = ts.slots[0]._id;
    const req = mockReq({ startTime: new Date() }, { slotId });
    const res = mockRes();

    await updateSlotById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

    it("rejects marking slot as available when no prices are provided", async () => {
    const ts = await TimeSlot.create({ subVenue: subVenueId, date: "2025-10-01", slots: [{
      startTime: new Date(),
      endTime: new Date(),
      prices: {},
      status: "blocked",
      bookedForSport: null
    }]});

    const slotId = ts.slots[0]._id as mongoose.Types.ObjectId;

    const req = mockReq({
      status: "available"
    }, { slotId });

    const res = mockRes();
    await updateSlotById(req, res);

    // Available without price should never be allowed
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects update when slotId is invalid", async () => {
    const req = mockReq({ prices: { cricket: 300 } }, { slotId: "123" });
    const res = mockRes();

    await updateSlotById(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  // delete slots

  it("deletes slots successfully for given date", async () => {
    await TimeSlot.create({ subVenue: subVenueId, date: "2025-08-01", slots: [] });

    const req = mockReq({}, { subVenueId });
    req.query = { date: "2025-08-01" };
    const res = mockRes();

    await deleteSlotsForDate(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("returns 404 when trying to delete non-existing slots", async () => {
    const req = mockReq({}, { subVenueId });
    req.query = { date: "2025-09-01" };
    const res = mockRes();

    await deleteSlotsForDate(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
