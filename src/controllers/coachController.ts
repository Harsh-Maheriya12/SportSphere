import { Request, Response } from "express";
import CoachDetail from "../models/coach/CoachDetail";
import CoachSlot from "../models/coach/CoachSlot";
import CoachBooking from "../models/coach/CoachBooking";
import User from "../models/User";
import { uploadToCloudinary } from "../utils/cloudinaryUploader";
import { deleteUploadedFiles } from "../utils/FileHelper";

// Get all coaches with basic details
export const getAllCoaches = async (req: Request, res: Response) => {
  try {
    const coaches = await User.find({ role: "coach" }).select(
      "username email profilePhoto age gender"
    );

    const coachesWithDetails = await Promise.all(
      coaches.map(async (coach) => {
        const detail = await CoachDetail.findOne({ coachId: coach._id });
        return {
          id: coach._id,
          username: coach.username,
          email: coach.email,
          profilePhoto: coach.profilePhoto,
          age: coach.age,
          gender: coach.gender,
          sports: detail?.sports || [],
          location: detail?.location || { city: "", state: "", country: "", address: "" },
          pricing: detail?.pricing || 0,
          experience: detail?.experience || 0,
        };
      })
    );

    res.json({ 
      success: true, 
      coaches: coachesWithDetails 
  });
  } catch (error) {
    throw error;
  }
};

// Get detailed coach profile by ID
export const getCoachProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coach = await User.findById(id).select(
      "username email profilePhoto age gender proof role"
    );

    if (!coach) {
      res.json({ 
        success: false, 
        message: "Coach not found" 
      });
      return;
    }

    if (coach.role !== "coach") {
      res.json({ 
        success: false, 
        message: "User is not a coach" 
      });
      return;
    }

    const detail = await CoachDetail.findOne({ coachId: id });

    res.json({
      success: true,
      coach: {
        id: coach._id,
        username: coach.username,
        email: coach.email,
        profilePhoto: coach.profilePhoto,
        age: coach.age,
        gender: coach.gender,
        proof: coach.proof,
        sports: detail?.sports || [],
        location: detail?.location || { city: "", state: "", country: "" },
        description: detail?.description || "",
        experience: detail?.experience || 0,
        pricing: detail?.pricing || 0,
        photoGallery: detail?.photoGallery || [],
      },
    });
  } catch (error) {
    throw error;
  }
};

// Create or update coach details (for coaches only)
export const createOrUpdateCoachDetail = async ( req: Request, res: Response ) => {
  const { sports, description, experience, pricing, city, state, country, address } = req.body;
  const files = req.files as Express.Multer.File[];

  try {
    if (req.user?.role !== "coach") {
      res.json({
        success: false,
        message: "Only coaches can update coach details",
      });
      return;
    }

    let sportsArray: string[] = [];
    if (sports) {
      sportsArray = typeof sports === "string" ? JSON.parse(sports) : sports;
    }

    let photoGallery: string[] = [];

    // Upload photos to Cloudinary if provided
    if (files && files.length > 0) {
      if (files.length > 10) {
        res.json({
          success: false,
          message: "Maximum 10 photos allowed",
        });
        return;
      }

      photoGallery = await Promise.all(
        files.map((file) => uploadToCloudinary(file.path, "coach-gallery"))
      );
    }

    const existingDetail = await CoachDetail.findOne({
      coachId: req.user._id,
    });

    if (existingDetail) {
      // Update existing details
      if (sportsArray.length > 0) existingDetail.sports = sportsArray;
      if (description) existingDetail.description = description;
      if (experience) existingDetail.experience = parseInt(experience);
      if (pricing) existingDetail.pricing = parseFloat(pricing);

      // Update location
        if (city && city !== "") existingDetail.location.city = city;
        if (state && state !== "") existingDetail.location.state = state;
        if (country && country !== "") existingDetail.location.country = country;
        if (address && address !== "") existingDetail.location.address = address;

      // Append new photos to existing gallery (max 10)
      if (photoGallery.length > 0) {
        existingDetail.photoGallery = [
          ...existingDetail.photoGallery,
          ...photoGallery,
        ].slice(0, 10);
      }

      await existingDetail.save();

      res.json({
        success: true,
        message: "Coach details updated successfully",
        coachDetail: existingDetail,
      });
    } else {
      // Create new coach details
      const newDetail = new CoachDetail({
        coachId: req.user._id,
        sports: sportsArray.length > 0 ? sportsArray : ["Not specified"],
        description: description || "",
        experience: parseInt(experience) || 0,
        pricing: parseFloat(pricing) || 0,
        location: {
          city: city || "",
          state: state || "",
          country: country || "",
          address: address || "",
        },
        photoGallery,
      });

      await newDetail.save();

      res.json({
        success: true,
        message: "Coach details created successfully",
        coachDetail: newDetail,
      });
    }
  } catch (error) {
    if (files && files.length > 0) {
      deleteUploadedFiles(files);
    }
    throw error;
  }
};

// Get coach's own details (for logged-in coach)
export const getMyCoachDetails = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false,
        message: "Only coaches can access this" 
      });
      return;
    }

    const detail = await CoachDetail.findOne({ coachId: req.user._id });

    if (!detail) {
      res.json({
        success: true,
        coachDetail: null,
        message: "No coach details found. Please create your profile.",
      });
      return;
    }

    res.json({ 
      success: true, 
      coachDetail: detail 
    });
  } catch (error) {
    throw error;
  }
};

// Delete photo from gallery
export const deleteCoachPhoto = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can delete photos" 
      });
      return;
    }

    const { photoUrl } = req.body;

    if (!photoUrl) {
      res.json({
        success: false,
        message: "Photo URL is required"
      });
      return;
    }

    const detail = await CoachDetail.findOne({ coachId: req.user._id });

    if (!detail) {
      res.json({
        success: false,
        message: "Coach details not found"
      });
      return;
    }

    detail.photoGallery = detail.photoGallery.filter((url) => url !== photoUrl);
    await detail.save();

    res.json({ 
      success: true, 
      message: "Photo deleted successfully" 
    });
  } catch (error) {
    throw error;
  }
};

// Get available slots for a coach
export const getCoachSlots = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // change today's time to mid night 
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const slots = await CoachSlot.find({
      coachId: id,
      isBooked: false,
      date: { $gte: today },
    }).sort({ date: 1, startTime: 1 });

    res.json({ 
      success: true, 
      slots ,
    });
  } catch (error) {
    throw error;
  }
};

// Create a new slot (for coaches only)
export const createCoachSlot = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can create slots" 
      });
      return;
    }

    const { date, startTime, endTime } = req.body;

    if (!date || !startTime || !endTime) {
      res.json({
        success: false,
        message: "Date, start time, and end time are required",
      });
      return;
    }

    // Parse the date and set time to midnight UTC to avoid timezone issues
    const slotDate = new Date(date);
    slotDate.setUTCHours(0, 0, 0, 0);

    // Check if slot already exists for same date and time
    const existingSlot = await CoachSlot.findOne({
      coachId: req.user._id,
      date: slotDate,
      startTime,
      endTime,
    });

    if (existingSlot) {
      res.json({
        success: false,
        message: "A slot already exists for the specified date and time",
      });
      return;
    }

    const newSlot = new CoachSlot({
      coachId: req.user._id,
      date: slotDate,
      startTime,
      endTime,
    });

    await newSlot.save();

    res.json({
      success: true,
      message: "Slot created successfully",
      slot: newSlot,
    });
  } catch (error) {
    throw error;
  }
};

// Get coach's own slots
export const getMySlots = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can access this" ,
      });
      return;
    }

    const slots = await CoachSlot.find({ coachId: req.user._id , isBooked: false }).sort({
      date: 1,
      startTime: 1,
    });

    res.json({ 
      success: true, 
      slots 
    });
  } catch (error) {
    throw error;
  }
};

// Delete a slot (for coaches only)
export const deleteCoachSlot = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can delete slots" 
      });
      return;
    }

    const { id } = req.params;

    const slot = await CoachSlot.findById(id);

    if (!slot) {
      res.json({ 
        success: false, 
        message: "This slot does not exist" 
      });
      return;
    }

    if (slot.coachId.toString() !== req.user._id.toString()) {
      res.json({
        success: false,
        message: "You can only delete your own slots",
      });
      return;
    }

    if (slot.isBooked) {
      res.json({
        success: false,
        message: "Cannot delete a booked slot",
      });
      return;
    }

    await CoachSlot.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: "Slot deleted successfully" 
    });
  } catch (error) {
    throw error;
  }
};

// Request a booking (for players only)
export const requestCoachBooking = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "player") {
      res.json({ 
        success: false, 
        message: "Only players can request bookings" 
      });
      return;
    }

    const { slotId } = req.body;

    if (!slotId) {
      res.json({ success: false, message: "Slot ID is required" });
      return;
    }

    const slot = await CoachSlot.findById(slotId);

    if (!slot) {
      res.json({ 
        success: false, 
        message: "This slot is not available" 
      });
      return;
    }

    if (slot.isBooked) {
      res.json({ 
        success: false, 
        message: "This slot is already booked" 
      });
      return;
    }

    // Check if player already has a pending or accepted booking for this slot
    const existingBooking = await CoachBooking.findOne({
      playerId: req.user._id,
      slotId,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingBooking) {
      res.json({
        success: false,
        message: "You already have a booking request for this slot",
      });
      return;
    }

    const newBooking = new CoachBooking({
      coachId: slot.coachId,
      playerId: req.user._id,
      slotId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "pending",
    });

    await newBooking.save();

    res.json({
      success: true,
      message: "Booking request sent successfully",
      booking: newBooking,
    });
  } catch (error) {
    throw error;
  }
};

// Get coach's booking requests
export const getCoachBookingRequests = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can access this" 
      });
      return;
    }

    const filter = { coachId: req.user._id };
    const fields = "username email profilePhoto age gender";
    const sortOrder = "-createdAt";

    const bookings = await CoachBooking.find(filter)
      .populate("playerId", fields)
      .sort(sortOrder);


    res.json({ 
      success: true, 
      bookings 
    });
  } catch (error) {
    throw error;
  }
};

// Accept a booking request
export const acceptBookingRequest = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can accept bookings" 
      });
      return;
    }

    const { id } = req.params;

    const booking = await CoachBooking.findById(id);

    if (!booking) {
      res.json({ 
        success: false, 
        message: "Booking not found" 
      });
      return;
    }

    if (booking.status !== "pending") {
      res.json({ 
        success: false, 
        message: "Booking is not pending" 
      });
      return;
    }

    // Check if slot is still available
    const slot = await CoachSlot.findById(booking.slotId);

    if (!slot) {
      res.json({ 
        success: false, 
        message: "This slot is not available" 
      });
      return;
    }

    if (slot.isBooked) {
      res.json({ 
        success: false, 
        message: "This slot is no longer available" 
      });
      return;
    }

    // Update booking status and mark slot as booked
    booking.status = "accepted";
    slot.isBooked = true;
    slot.bookedBy = booking.playerId;

    await booking.save();
    await slot.save();

    res.json({
      success: true,
      message: "Booking accepted successfully",
      booking,
    });
  } catch (error) {
    throw error;
  }
};

// Reject a booking request
export const rejectBookingRequest = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "coach") {
      res.json({ 
        success: false, 
        message: "Only coaches can reject bookings" 
      });
      return;
    }

    const { id } = req.params;
    const { rejectionReason } = req.body;

    const booking = await CoachBooking.findById(id);

    if (!booking) {
      res.json({ 
        success: false, 
        message: "Booking not found" 
      });
      return;
    }

    if (booking.status !== "pending") {
      res.json({ 
        success: false, 
        message: "Booking is not pending" 
      });
      return;
    }

    booking.status = "rejected";
    booking.rejectionReason = rejectionReason || "No reason provided";

    await booking.save();

    res.json({
      success: true,
      message: "Booking rejected successfully",
      booking,
    });
  } catch (error) {
    throw error;
  }
};

// Get coach bookings of player
export const getMyCoachBookings = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "player") {
      res.json({ 
        success: false, 
        message: "Only players can access this" 
      });
      return;
    }

    const filter = { playerId: req.user._id };
    const sortOrder = "-createdAt";
    const fields = "username email profilePhoto";

    const bookings = await CoachBooking.find(filter)
      .populate("coachId", fields)
      .sort(sortOrder);

    res.json({ 
      success: true, bookings 
    });
  } catch (error) {
    throw error;
  }
};
