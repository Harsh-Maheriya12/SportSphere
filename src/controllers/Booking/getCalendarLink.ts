import asyncHandler from "express-async-handler";
import Booking from "../../models/Booking";
import AppError from "../../utils/AppError";
import { IUserRequest } from "src/middleware/authMiddleware";

// Get calendar link for a booking
export const getCalendarLink = asyncHandler(async (req:IUserRequest, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) throw new AppError("Booking not found", 404);
  
  // Ensure the requesting user owns the booking
  if (booking.user.toString() !== req.user._id.toString()) {
  throw new AppError("Not authorized to view this calendar link", 403);
  }

  // Return the calendar link
  res.json({
    success: true,
    calendarLink: booking.calendarLink
  });
});
