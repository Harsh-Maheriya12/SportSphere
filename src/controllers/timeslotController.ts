import { Request, Response } from "express";
import mongoose from "mongoose";
import TimeSlot from "../models/TimeSlot";
import SubVenue from "../models/SubVenue";
import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

//validate date format YYYY-MM-DD
const isValidDate = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

const TZ = process.env.SERVER_TZ || "Asia/Kolkata";

const pad2 = (n: number) => String(n).padStart(2, "0");

const buildSlotTimes = (dateStr: string, hour: number, tz: string) => {
  const startLocal = `${dateStr}T${pad2(hour)}:00:00`;
  const endLocal = hour === 23
    ? `${dateStr}T23:59:59`
    : `${dateStr}T${pad2(hour + 1)}:00:00`;

  const startTime = fromZonedTime(startLocal, tz);
  const endTime = fromZonedTime(endLocal, tz);
  return { startTime, endTime };
};

//generate time slots for a subvenue + date(24 slots)
export const generateTimeSlots = async (req: Request, res: Response) => {
  try {
    const { subVenue, date } = req.body;

    /* Validate required fields */
    if (!subVenue || !date) {
      return res.status(400).json({
        success: false,
        message: "subVenue and date are required",
      });
    }

    /* Validate date format */
    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must be in YYYY-MM-DD format",
      });
    }

    /* Prevent generating slots for past dates (based on configured TZ) */
    const todayStr = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    if (date < todayStr) {
      return res.status(400).json({
        success: false,
        message: "Cannot generate slots for past dates",
      });
    }

    /* Validate subVenue */
    if (!mongoose.Types.ObjectId.isValid(subVenue)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subVenue ID",
      });
    }

    const sv = await SubVenue.findById(subVenue);
    if (!sv) {
      return res.status(404).json({
        success: false,
        message: "SubVenue not found",
      });
    }

    if (sv.sports.length === 0) {
      return res.status(400).json({
        success: false,
        message: "SubVenue must have at least one sport before generating slots",
      });
    }

    /* Prevent duplicate day generation */
    const existing = await TimeSlot.findOne({ subVenue, date });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Slots for this date already exist",
        timeSlotId: existing._id,
      });
    }

    /* Generate 24 slots aligned to TZ, stored as UTC instants */
    const slots = [] as Array<any>;
    const [selYear, selMonth, selDay] = date.split("-").map(Number);
    const nowTz2 = toZonedTime(new Date(), TZ);
    const isToday = (
      selYear === nowTz2.getFullYear() &&
      selMonth === nowTz2.getMonth() + 1 &&
      selDay === nowTz2.getDate()
    );

    const currentHourTz = nowTz2.getHours();
    const startHour = isToday ? currentHourTz + 1 : 0; // Start from next hour if today in TZ
    const endHour = 24;

    for (let hour = startHour; hour < endHour; hour++) {
      const { startTime, endTime } = buildSlotTimes(date, hour, TZ);

      slots.push({
        startTime,
        endTime,
        prices: {},
        status: "blocked",
        bookedForSport: null,
      });
    }

    const tsDoc = await TimeSlot.create({ subVenue, date, slots });

    return res.status(201).json({ success: true, timeSlot: tsDoc });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//get slots for a subvenue + date 
export const getSlotsForSubVenueDate = async (req: Request, res: Response) => {
  try {
    const { subVenueId } = req.params;
    const { date } = req.query as { date?: string };

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date query param is required (YYYY-MM-DD)",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    const ts = await TimeSlot.findOne({ subVenue: subVenueId, date });
      
    if (!ts) {
      return res.status(200).json({
        success: true,
        subVenue: subVenueId,
        date,
        slots: [],
      });
    }

    return res.status(200).json({ success: true, timeSlot: ts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//update a specific slot by its ID
export const updateSlotById = async (req: Request, res: Response) => {
  try {
    const { slotId } = req.params;
    const { prices, status, bookedForSport } = req.body;

    /* Validate slotId */
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid slot ID",
      });
    }

    /* Cannot modify startTime or endTime */
    if ("startTime" in req.body || "endTime" in req.body) {
      return res.status(400).json({
        success: false,
        message: "Cannot modify startTime or endTime of slot",
      });
    }

    /* Find parent document (contains this slot) */
    const parent = await TimeSlot.findOne({ "slots._id": slotId }).populate("subVenue");
    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Slot not found",
      });
    }

    const subVenue = await SubVenue.findById(parent.subVenue);
    if (!subVenue) return res.status(400).json({ success: false, message: "Invalid subVenue" });

    const validSports = subVenue.sports.map((s) => s.name);

    /* Validate prices if provided */
if (prices) {
  // Convert SportsEnum[] → string[] for safe comparison
  const validSports = subVenue.sports.map((s) => s.name as string);

  for (const sportName in prices) {
    // sportName is string, so validSports must also be string[]
    if (!validSports.includes(sportName)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sport '${sportName}' for this subVenue`,
      });
    }

    const value = prices[sportName];
    if (typeof value !== "number" || value <= 0) {
      return res.status(400).json({
        success: false,
        message: `Price for ${sportName} must be a positive number`,
      });
    }
  }
}


    /* Validate status */
    const allowedStatuses = ["available", "blocked", "booked"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
      });
    }

    /* Available slot MUST have pricing */
    if (status === "available" && (!prices || Object.keys(prices).length === 0)) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark slot 'available' without setting at least one price",
      });
    }

    /* Validate bookedForSport */
    if (bookedForSport) {
      if (!validSports.includes(bookedForSport)) {
        return res.status(400).json({
          success: false,
          message: `Invalid bookedForSport '${bookedForSport}'. Must be one of ${validSports.join(", ")}`,
        });
      }
    }

    /* If slot is blocked → clear bookedForSport */
    if (status === "blocked") {
      req.body.bookedForSport = null;
    }

    /* Build update object */
    const setObj: any = {};
    if (prices !== undefined) setObj["slots.$.prices"] = prices;
    if (status !== undefined) setObj["slots.$.status"] = status;
    if (req.body.bookedForSport !== undefined)
      setObj["slots.$.bookedForSport"] = req.body.bookedForSport;

    /* Apply update */
    const updated = await TimeSlot.findOneAndUpdate(
      { "slots._id": slotId },
      { $set: setObj },
      { new: true }
    );

    const updatedSlot = updated?.slots.find((s) => s._id.toString() === slotId);

    return res.status(200).json({
      success: true,
      slot: updatedSlot,
      timeSlotId: updated?._id,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//delete all slots for a subvenue + date

export const deleteSlotsForDate = async (req: Request, res: Response) => {
  try {
    const { subVenueId } = req.params;
    const { date } = req.query as { date?: string };

    if (!isValidDate(date || "")) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format (YYYY-MM-DD required)",
      });
    }

    const deleted = await TimeSlot.findOneAndDelete({ subVenue: subVenueId, date });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "No timeslots found for this subVenue and date",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Timeslots deleted successfully",
      timeSlotId: deleted._id,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
