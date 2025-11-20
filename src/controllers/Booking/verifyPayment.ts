import asyncHandler from "express-async-handler";
import { Response, RequestHandler } from "express";
import { IUserRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import Booking from "../../models/Booking";
import Stripe from "stripe";

// Lazy-load Stripe
let stripe: Stripe;
const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new AppError('STRIPE_SECRET_KEY is not set in environment variables', 500);
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });
  }
  return stripe;
};

export const verifyPayment: RequestHandler = asyncHandler(async (req: IUserRequest, res: Response): Promise<void> => {
  const { sessionId } = req.query;
  const userId = req.user._id;

  if (!sessionId || typeof sessionId !== 'string') {
    throw new AppError("Session ID is required", 400);
  }

  console.log('🔍 Verifying payment for session:', sessionId);

  // Retrieve the session from Stripe
  const stripeClient = getStripe();
  const session = await stripeClient.checkout.sessions.retrieve(sessionId);

  console.log('💳 Stripe session status:', session.payment_status);

  // Find the booking
  const booking = await Booking.findOne({ 
    stripeSessionId: sessionId,
    user: userId 
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  // Update booking status based on payment status
  if (session.payment_status === 'paid') {
    booking.status = 'Paid';
    booking.stripePaymentIntentId = session.payment_intent as string;
    await booking.save();

    console.log('✅ Booking updated to Paid:', booking._id);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      booking: {
        id: booking._id,
        status: booking.status,
      }
    });
  } else if (session.payment_status === 'unpaid') {
    res.json({
      success: false,
      message: 'Payment not completed',
      booking: {
        id: booking._id,
        status: booking.status,
      }
    });
  } else {
    res.json({
      success: false,
      message: 'Payment status unknown',
      booking: {
        id: booking._id,
        status: booking.status,
      }
    });
  }
});