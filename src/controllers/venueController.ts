// src/controllers/venueController.ts
import { City } from "country-state-city";
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
      capacity,
      sports,
      images,
      pricePerHour,
    } = req.body;

    if (!name || !address || !city || !pricePerHour) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Validate & auto-fetch city lat/lng
    const cities = City.getCitiesOfCountry("IN");
    if (!cities) {
      return res.status(500).json({ message: "Failed to load city list" });
    }

    const matchedCity = cities.find(
      c => c.name.toLowerCase() === city.toLowerCase()
    );

    if (!matchedCity) {
      return res.status(400).json({
        message: `City "${city}" is not valid. Please select a real Indian city.`,
        suggestions: cities.slice(0, 10).map(c => c.name),
      });
    }

    const latitude = Number(matchedCity.latitude);
const longitude = Number(matchedCity.longitude);

if (isNaN(latitude) || isNaN(longitude)) {
  return res.status(500).json({ message: "City coordinates not found" });
}


    // ✅ Create venue with auto coordinates
    const newVenue = new Venue({
      name,
      description,
      address,
      city,
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // auto-filled
      },
      capacity,
      sports,
      images,
      pricePerHour,
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
// GET ALL VENUES (Sport, City, optional radius search)
// -----------------------------------------
export const getAllVenues = async (req: Request, res: Response) => {
  try {
    const { sport, city, radius, userLat, userLng, q } = req.query;

    const query: any = {};
    const hasSearch =
      (q && q.toString().trim().length > 0) ||
      (city && city.toString().trim().length > 0) ||
      (sport && sport.toString().trim().length > 0);

    // STEP 1: TEXT FILTERS (apply only if user searched)
    if (q && typeof q === "string" && q.trim().length > 0) {
      // strict search for venue name first
      query.name = { $regex: new RegExp("^"+q.trim(), "i") };
    }

    // Apply sport filter (case-insensitive)
    if (sport && typeof sport === "string" && sport.trim().length > 0) {
      query.sports = { $regex: new RegExp("^"+sport.trim(), "i") };
    }

    // Apply city filter (case-insensitive)
    if (city && typeof city === "string" && city.trim().length > 0) {
      query.city = { $regex: new RegExp("^"+city.trim(), "i") };
    }

    // STEP 2: DETERMINE COORDINATES
    let latitude: number | null = null;
    let longitude: number | null = null;

    // (1) From frontend query params
    if (userLat && userLng) {
      latitude = Number(userLat);
      longitude = Number(userLng);
    }

    // (2) Logged-in user location
    else if ((req as any).user?.location?.coordinates) {
      const [lng, lat] = (req as any).user.location.coordinates;
      latitude = lat;
      longitude = lng;
    }

    // (3) City provided (use its coordinates)
    else if (city) {
      const cities = City.getCitiesOfCountry("IN") ?? [];
      const matchedCity = cities.find(
        (c) => c.name.toLowerCase() === (city as string).toLowerCase()
      );
      if (matchedCity) {
        latitude = Number(matchedCity.latitude);
        longitude = Number(matchedCity.longitude);
      }
    }

    // (4) Default fallback → Ahmedabad
    if (!latitude || !longitude) {
      latitude = 23.0225;
      longitude = 72.5714;
    }

    // STEP 3: APPLY GEO FILTER only if no venue search
    if (!hasSearch || radius) {
      query.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          ...(radius ? { $maxDistance: Number(radius) * 1000 } : { $maxDistance: 20000 }),
        },
      };
    }

    // STEP 4: FETCH
    const venues = await Venue.find(query).limit(40);

    return res.json({
      success: true,
      count: venues.length,
      results: venues,
      appliedFilters: {
        q: q || "NONE",
        sport: sport || "ALL",
        city: city || "AUTO",
        radius: radius || "NONE",
      },
      usedLocation: { latitude, longitude },
    });
  } catch (err) {
    console.error("Venue search error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
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



// -----------------------------------------
// Auto-Complete suggetion
// -----------------------------------------

export const getSuggestions = async (req: Request, res: Response) => {
  try {
    const { q, type } = req.query;

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.json([]);
    }

    const regex = new RegExp("^"+ q.trim(), "i");

    let filter: any = {};
    let projection: any = {};

    if (type === "city") {
      filter.city = regex;
      projection = { city: 1 };
    } else if (type === "sport") {
      filter.sports = regex;
      projection = { sports: 1 };
    } else {
      // default: venue name or description
      filter.$or = [{ name: regex }, { description: regex }];
      projection = { name: 1 };
    }

    const results = await Venue.find(filter, projection).limit(8);

    // Remove duplicates & flatten if needed
    let suggestions: string[] = [];

    if (type === "sport") {
      results.forEach((r) => {
        if (Array.isArray(r.sports)) suggestions.push(...r.sports);
        else if (r.sports) suggestions.push(r.sports);
      });
    } else if (type === "city") {
      suggestions = results.map((r) => r.city) as string[];

    } else {
      suggestions = results.map((r) => r.name);
    }

    // Remove duplicates and nulls
    suggestions = [...new Set(suggestions.filter(Boolean))];

    res.json(suggestions);
  } catch (err) {
    console.error("Suggestion error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

