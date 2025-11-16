// src/controllers/venueController.ts
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import mongoose from "mongoose";
import Venue from "../models/Venue";

// -----------------------------------------
// CREATE VENUE
// -----------------------------------------
export const createVenue = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const owner = (req as any).user?._id;
    if (!owner) {
      return res.status(401).json({ message: "Unauthorized — no user found from token" });
    }

    const {
      name,
      description,
      address,
      city,
      latitude,
      longitude,
      capacity,
      sports,
      images,
      pricePerHour,
      amenities,
      timeSlots,
    } = req.body;

    if (!name || !address || !city || !pricePerHour) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newVenue = new Venue({
      name,
      description,
      address,
      city,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      capacity,
      sports,
      images,
      pricePerHour,
      amenities,
      timeSlots,
      owner,
    });

    const savedVenue = await newVenue.save();
    return res.status(201).json({
      message: "Venue created successfully!",
      venue: savedVenue,
    });
  } catch (error) {
    console.error("Error creating venue:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------------------
// GET ALL VENUES
// -----------------------------------------
export const getAllVenues = async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q?: string };

    const filter: any = {};
    if (q && q.trim().length > 0) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { name: regex },
        { city: regex },
        { address: regex },
        { sports: regex },
      ];
    }

    const venues = await Venue.find(filter).populate("owner", "username email");
    return res.status(200).json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------------------
// GET VENUE BY ID
// -----------------------------------------
export const getVenueById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    const venue = await Venue.findById(id).populate("owner", "username email");
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    return res.status(200).json(venue);
  } catch (error) {
    console.error("Error fetching venue by id:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------------------
// DELETE VENUE
// -----------------------------------------
export const deleteVenue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }

    const venue = await Venue.findById(id);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    const user = (req as any).user;
    const isOwner = user && venue.owner.toString() === user._id.toString();
    const isAdmin = user && user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this venue" });
    }

    await venue.deleteOne();
    return res.status(200).json({ message: "Venue deleted successfully" });
  } catch (error) {
    console.error("Error deleting venue:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
