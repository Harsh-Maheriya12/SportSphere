import { Request, Response } from "express";
import SubVenue from "../models/SubVenue";
import Venue from "../models/Venue";
import { IUserRequest } from "../middleware/authMiddleware";
import Booking from "../models/Booking";
import cloudinary from "../config/cloudinary";
import fs from "fs";

// Create Venue 
export const createVenue = async (req: IUserRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let imageUrls: string[] = [];

    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const uploads = await Promise.all(
        files.map((file) => cloudinary.uploader.upload(file.path))
      );

      imageUrls = uploads.map((img) => img.secure_url);

      files.forEach((file) => fs.unlinkSync(file.path));
    }

    const venueData: any = {
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      phone: req.body.phone,
      owner: req.user._id,
      amenities: req.body.amenities
        ? req.body.amenities.split(",").map((a: string) => a.trim())
        : [],
      images: imageUrls,
    };

    // optional location support
    if (
      req.body.location &&
      req.body.location.coordinates &&
      Array.isArray(req.body.location.coordinates) &&
      req.body.location.coordinates.length === 2
    ) {
      venueData.location = {
        type: "Point",
        coordinates: req.body.location.coordinates,
      };
    }

    const venue = await Venue.create(venueData);

    return res.status(201).json({ success: true, venue });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};




//Get All Venues
export const getVenues = async (_req: Request, res: Response) => {
  try {
    const venues = await Venue.find();
    return res.status(200).json({ success: true, venues });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//Get My Venues (for venue owner)
export const getMyVenues = async (req: IUserRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const venues = await Venue.find({ owner: req.user._id });
    
    // Also get calendar link for any paid booking
    const booking = await Booking.findOne({ venueOwner: req.user._id, status: "Paid" });
    return res.status(200).json({ 
      success: true, 
      venues, 
      calendarLink: booking? booking.calendarLink: null 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//Get Venue By ID
export const getVenueById = async (req: Request, res: Response) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }
    return res.status(200).json({ success: true, venue });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Venue (safe + optional location + image support)
export const updateVenue = async (req: Request, res: Response) => {
  try {
    let imageUrls: string[] = [];
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const uploads = await Promise.all(
        files.map((file) => cloudinary.uploader.upload(file.path))
      );

      imageUrls = uploads.map((img) => img.secure_url);
      files.forEach((file) => fs.unlinkSync(file.path));
    }

    const updateData: any = {
      name: req.body.name,
      address: req.body.address,
      city: req.body.city,
      phone: req.body.phone,
      amenities: req.body.amenities
        ? req.body.amenities.split(",").map((a: string) => a.trim())
        : undefined,
    };

    // Optional location handling
    if (
      req.body.location &&
      req.body.location.coordinates &&
      Array.isArray(req.body.location.coordinates) &&
      req.body.location.coordinates.length === 2
    ) {
      updateData.location = {
        type: "Point",
        coordinates: req.body.location.coordinates,
      };
    }

    if (imageUrls.length > 0) {
      updateData.images = imageUrls;
    }

    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!venue) {
      return res
        .status(404)
        .json({ success: false, message: "Venue not found" });
    }

    return res.status(200).json({ success: true, venue });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



//Delete Venue
export const deleteVenue = async (req: Request, res: Response) => {
  try {
    const venue = await Venue.findByIdAndDelete(req.params.id);

    if (!venue) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }

    // Optionally delete its subvenues too
    await SubVenue.deleteMany({ venue: venue._id });

    return res.status(200).json({ success: true, message: "Venue deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to update venue.sports based on its subvenues
const updateVenueSports = async (venueId: string) => {
  const subVenues = await SubVenue.find({ venue: venueId });

  const sportsSet = new Set<string>();

  subVenues.forEach((sv) => {
    sv.sports.forEach((s) => sportsSet.add(s.name));
  });

  await Venue.findByIdAndUpdate(venueId, {
    sports: Array.from(sportsSet),
  });
};

// Create SubVenue 
export const createSubVenue = async (req: Request, res: Response) => {
  try {
    const venueId = req.params.venueId; // coming from URL 

    let imageUrls: string[] = [];
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const uploads = await Promise.all(
        files.map((file) => cloudinary.uploader.upload(file.path))
      );

      imageUrls = uploads.map((img) => img.secure_url);
      files.forEach((file) => fs.unlinkSync(file.path));
    }

    const subVenueData = {
      name: req.body.name,
      venue: venueId, //  THIS IS THE CRITICAL LINE
      amenities: req.body.amenities
        ? req.body.amenities.split(",").map((a: string) => a.trim())
        : [],
      sports: req.body.sports ? JSON.parse(req.body.sports) : [],
      images: imageUrls,
    };

    const subVenue = await SubVenue.create(subVenueData);

    await updateVenueSports(venueId);

    return res.status(201).json({ success: true, subVenue });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};




//Get SubVenues By Venue
export const getSubVenuesByVenue = async (req: Request, res: Response) => {
  try {
    const subVenues = await SubVenue.find({ venue: req.params.venueId });

    return res.status(200).json({ success: true, subVenues });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update SubVenue (safe + image support)
export const updateSubVenue = async (req: Request, res: Response) => {
  try {
    let imageUrls: string[] = [];
    const files = req.files as Express.Multer.File[];

    if (files && files.length > 0) {
      const uploads = await Promise.all(
        files.map((file) => cloudinary.uploader.upload(file.path))
      );

      imageUrls = uploads.map((img) => img.secure_url);
      files.forEach((file) => fs.unlinkSync(file.path));
    }

    const updateData: any = {
      name: req.body.name,
      amenities: req.body.amenities
        ? req.body.amenities.split(",").map((a: string) => a.trim())
        : undefined,
      sports: req.body.sports ? JSON.parse(req.body.sports) : undefined,
    };

    if (imageUrls.length > 0) {
      updateData.images = imageUrls;
    }

    const subVenue = await SubVenue.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!subVenue) {
      return res
        .status(404)
        .json({ success: false, message: "SubVenue not found" });
    }

    await updateVenueSports(subVenue.venue.toString());

    return res.status(200).json({ success: true, subVenue });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


//Delete SubVenue
export const deleteSubVenue = async (req: Request, res: Response) => {
  try {
    const subVenue = await SubVenue.findByIdAndDelete(req.params.id);

    if (!subVenue) {
      return res.status(404).json({ success: false, message: "SubVenue not found" });
    }

    // Auto-update venue sports
    await updateVenueSports(subVenue.venue.toString());

    return res.status(200).json({ success: true, message: "SubVenue deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Rate/UpdateRating Venue
export const rateVenue = async (req: Request, res: Response) => {
  try {
    const venueId = req.params.id;
    const { userId, rating } = req.body;

    if (!userId || !rating) {
      return res.status(400).json({ success: false, message: "userId and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }

    // Check if user already rated this venue
    const existingRating = venue.ratings.find((r) => r.userId.toString() === userId);

    if (existingRating) {
      // Update user's existing rating
      existingRating.rating = rating;
    } else {
      // Add a new rating entry
      venue.ratings.push({ userId, rating });
    }

    // Recalculate venue average + totalRatings
    const total = venue.ratings.reduce((sum, r) => sum + r.rating, 0);
    venue.totalRatings = venue.ratings.length;
    venue.averageRating = total / venue.totalRatings;

    await venue.save();

    return res.status(200).json({
      success: true,
      averageRating: venue.averageRating,
      totalRatings: venue.totalRatings,
      ratings: venue.ratings
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Venue Ratings
export const getVenueRatings = async (req: Request, res: Response) => {
  try {
    const venue = await Venue.findById(req.params.id);

    if (!venue) {
      return res.status(404).json({ success: false, message: "Venue not found" });
    }

    return res.status(200).json({
      success: true,
      ratings: venue.ratings,
      averageRating: venue.averageRating,
      totalRatings: venue.totalRatings,
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
