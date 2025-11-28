import asyncHandler from "express-async-handler";
import { Response, RequestHandler } from "express";
import { IUserRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";

import Game from "../../models/gameModels";
import TimeSlot from "../../models/TimeSlot";
import Booking from "../../models/Booking";

import Stripe from "stripe";
import mongoose from "mongoose";

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

export const startGameBooking: RequestHandler = asyncHandler(async (req: IUserRequest, res: Response): Promise<void> => {
  const { gameId } = req.params;
  const userId = req.user._id;

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  // Host check
  if (game.host.toString() !== userId.toString()) {
    throw new AppError("Only the host can start booking", 403);
  }

  // Prevent duplicate booking
  if (game.status === "Completed" || game.bookingStatus === "Booked") {
    throw new AppError("This game is already booked or completed", 400);
  }

  // Minimum players requirement
  if (game.approvedPlayers.length < game.playersNeeded.min) {
    throw new AppError(
      `Need at least ${game.playersNeeded.min} players to book`,
      400
    );
  }

  // Get TimeSlot doc
  const ts = await TimeSlot.findById(game.slot.timeSlotDocId);
  if (!ts) throw new AppError("TimeSlot document not found", 404);

  // Correct slot lookup (DocumentArray)
  const slot = (ts.slots as mongoose.Types.DocumentArray<any>).id(
    game.slot.slotId
  );
  if (!slot) throw new AppError("Slot not found", 404);

  if (slot.status !== "available") {
    throw new AppError("Slot is no longer available", 400);
  }

  const totalPrice = game.slot.price * 100; // Convert to paise

  // Atomic Lock: Try to lock the slot only if it is available
  const lockedTs = await TimeSlot.findOneAndUpdate(
    {
      _id: game.slot.timeSlotDocId,
      "slots._id": game.slot.slotId,
      "slots.status": "available"
    },
    {
      $set: {
        "slots.$.status": "booked",
        "slots.$.bookedForSport": game.sport
      }
    },
    { new: true }
  );

  if (!lockedTs) {
    throw new AppError("Slot is no longer available", 400);
  }

  try {

    // Create Stripe session
    const stripeClient = getStripe();
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "inr",
            unit_amount: totalPrice,
            product_data: {
              name: `Game Booking (${game.sport})`,
            },
          },
          quantity: 1,
        },
      ],

      metadata: {
        type: "game",
        userId: userId.toString(),
        gameId: (game._id as mongoose.Types.ObjectId).toString(),
        slotId: game.slot.slotId.toString(),
      },

      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    });

    // Create booking
    const booking = await Booking.create({
      user: userId,
      gameId: game._id as mongoose.Types.ObjectId, 

      venueId: game.venue.venueId,
      coordinates: {
        type: "Point",
        coordinates: game.venue.coordinates.coordinates,
      },

      startTime: game.slot.startTime,
      endTime: game.slot.endTime,

      amount: totalPrice,
      currency: "inr",

      stripeSessionId: session.id,
      status: "Pending",
    });

    // Update game status to Full since booking is confirmed
    game.status = "Full";
    await game.save();

    res.json({
      success: true,
      url: session.url,
      bookingId: booking._id,
    });
  } catch (error) {
    // Rollback: Unlock the slot if anything fails after locking
    await TimeSlot.findOneAndUpdate(
      { _id: game.slot.timeSlotDocId, "slots._id": game.slot.slotId },
      {
        $set: {
          "slots.$.status": "available",
          "slots.$.bookedForSport": null
        }
      }
    );
    throw error;
  }
});