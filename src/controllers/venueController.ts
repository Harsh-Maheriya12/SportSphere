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
      amenities,
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
      amenities,
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
// GET ALL VENUES (Sport + City required, optional radius search) — NO PAGINATION
// -----------------------------------------
export const getAllVenues = async (req: Request, res: Response) => {
  try {
    const { sport, city, radius } = req.query;

    // Check required parameters
    if (!sport || !city) {
      return res.status(400).json({
        success: false,
        message: "Both 'sport' and 'city' are required",
      });
    }

    // Validate city using library (India only)
    const indianCities = City.getCitiesOfCountry("IN") ?? [];
    const validCityNames = indianCities.map(c => c.name.toLowerCase());

    if (!validCityNames.includes((city as string).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `City "${city}" is not valid.`,
        validExamples: indianCities.slice(0, 10).map(c => c.name),
      });
    }

    // Get lat/lng of selected city
    const matchedCity = indianCities.find(
      c => c.name.toLowerCase() === (city as string).toLowerCase()
    );

    const cityLat = Number(matchedCity?.latitude);
    const cityLng = Number(matchedCity?.longitude);

    const query: any = {
      sports: { $in: [sport] },
      city: { $regex: city as string, $options: "i" },
    };

    //Apply geo filter only if radius provided
    if (radius) {
      query.location = {
        $near: {
          $geometry: { type: "Point", coordinates: [cityLng, cityLat] },
          $maxDistance: Number(radius) * 1000, // km → meters
        },
      };
    }

    //Fetch all results (no pagination)
    const venues = await Venue.find(query);

    return res.json({
      success: true,
      count: venues.length,
      results: venues,
      appliedGeoFilter: Boolean(radius),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
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

    if (!query) {
      return res.json([]);
    }

    const suggestions = await Venue.find(
      { name: { $regex: `^${query}`, $options: "i" } },
      { name: 1 } // only return name
    ).limit(8);

    res.json(suggestions.map(v => v.name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
