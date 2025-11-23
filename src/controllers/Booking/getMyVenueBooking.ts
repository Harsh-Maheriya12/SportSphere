import asyncHandler from "express-async-handler";
import { Response, RequestHandler } from "express";
import { IUserRequest } from "../../middleware/authMiddleware";
import Booking from "../../models/Booking";


export const getMyVenueBookings: RequestHandler = asyncHandler(async (req: IUserRequest, res: Response): Promise<void> => {
  const userId = req.user._id;

  // Fetch all bookings for this user
  const bookings = await Booking.find({ user: userId })
    .populate({
      path: "venueId",
      select: "name address city images location"
    })
    .populate({
      path: "subVenueId",
      select: "name"
    })
    .sort({ createdAt: -1 });

  console.log(`📚 Found ${bookings.length} bookings for user ${userId}`);

  // Transform bookings to match frontend expectations
  const transformedBookings = bookings.map((booking: any) => {
    // Extract data from booking
    const venue = booking.venueId || {};
    const subVenue = booking.subVenueId || {};
    
    return {
      _id: booking._id,
      venue: {
        _id: venue._id,
        name: venue.name || "Unknown Venue",
        address: venue.address || "",
        city: venue.city || "",
        images: venue.images || []
      },
      subVenue: {
        _id: subVenue._id || "N/A",
        name: subVenue.name || "Direct Booking"
      },
      sport: booking.sport || "N/A",
      date: booking.startTime,
      startTime: booking.startTime,
      endTime: booking.endTime,
      price: booking.amount / 100, // Convert paise to rupees
      status: booking.status === "Paid" ? "confirmed" : booking.status === "Pending" ? "pending" : booking.status.toLowerCase(),
      createdAt: booking.createdAt
    };
  });

  res.json({
    success: true,
    bookings: transformedBookings,
  });
});