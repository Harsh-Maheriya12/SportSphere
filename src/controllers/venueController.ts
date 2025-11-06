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
    const { sport, city, radius, userLat, userLng } = req.query;

    //  STEP 1: BASE QUERY
    const query: any = {};
    if (sport) query.sports = { $in: [sport] };
    if (city) query.city = { $regex: city as string, $options: "i" };

    //  STEP 2: FIND COORDINATES 
    let latitude: number | null = null;
    let longitude: number | null = null;

    // (1) If frontend sent direct coords (highest priority)
    if (userLat && userLng) {
      latitude = Number(userLat);
      longitude = Number(userLng);
    }

    // (2) Else use logged-in user's saved location
    else if ((req as any).user?.location?.coordinates) {
      const [lng, lat] = (req as any).user.location.coordinates;
      latitude = lat;
      longitude = lng;
    }

    // (3) Else if city provided, use city lat/lng
    else if (city) {
      const cities = City.getCitiesOfCountry("IN") ?? [];
      const matchedCity = cities.find(
        c => c.name.toLowerCase() === (city as string).toLowerCase()
      );

      if (!matchedCity) {
        return res.status(400).json({
          success: false,
          message: `City "${city}" is not valid.`,
          validExamples: cities.slice(0, 10).map(c => c.name),
        });
      }

      latitude = Number(matchedCity.latitude);
      longitude = Number(matchedCity.longitude);
    }

    // (4) Fallback default (Ahmedabad)
    else {
      latitude = 23.0225;
      longitude = 72.5714;
    }

    //  STEP 3: APPLY GEO FILTER (SORT BY DISTANCE) 
    query.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        ...(radius ? { $maxDistance: Number(radius) * 1000 } : {}),
      },
    };

    //  STEP 4: FETCH DATA (LIMIT 40) 
    const venues = await Venue.find(query).limit(40);

    return res.json({
      success: true,
      count: venues.length,
      results: venues,
      appliedFilters: {
        sport: sport || "ALL",
        city: city || "AUTO-NEAREST",
        radius: radius || "NONE",
      },
      usedLocation: { latitude, longitude },
    });

  } catch (err) {
    console.error(err);
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
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      return res.json([]);
    }

    // Search across venue name, city, and sports
    const suggestions = await Venue.find(
      {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { city: { $regex: query, $options: "i" } },
          { sports: { $regex: query, $options: "i" } }
        ]
      },
      { name: 1 } // return only names
    )
      .limit(10)
      .lean();

    // Remove duplicates & return only venue names
    const uniqueNames = [...new Set(suggestions.map(v => v.name))];

    return res.json(uniqueNames);

  } catch (err) {
    console.error("Suggestion Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
