import asyncHandler from "express-async-handler";
import { Response, RequestHandler } from "express";
import { IUserRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";

import Game from "../../models/gameModels";
import TimeSlot from "../../models/TimeSlot";
import Booking from "../../models/Booking";

import Stripe from "stripe";
import mongoose from "mongoose";
import logger from "../../config/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

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
  if (game.bookingStatus === "Booked" || game.status === "Completed") {
    throw new AppError("This game is already booked or completed", 400);
  }

  // Minimum players requirement
  if (game.approvedPlayers.length < game.playersNeeded.min) {
    throw new AppError(
      `Need at least ${game.playersNeeded.min} players to book`,
      400
    );
  }

  const { timeSlotDocId, slotId, startTime, endTime, price } = game.slot;

  // Atomic slot reservation
  const lockedSlotDoc = await TimeSlot.findOneAndUpdate(
    {
      _id: timeSlotDocId,
      "slots._id": slotId,
      "slots.status": "available",
    },
    {
      $set: {
        "slots.$.status": "booked",
        "slots.$.bookedForSport": game.sport,
      },
    },
    { new: true }
  );

  if (!lockedSlotDoc) {
    throw new AppError("Slot is no longer available", 400);
  }

  const totalPrice = game.slot.price * 100;
  let booking: any;
  try {
    // Pre-generate Booking ID
    const bookingId = new mongoose.Types.ObjectId();

    // Check if we should bypass Stripe (for demo/showcase)
    const bypassStripe = process.env.BYPASS_STRIPE_PAYMENT === 'true';

    let session: any = null;
    let stripeSessionId: string;
    let stripePaymentIntentId: string | undefined;
    let bookingStatus: string;

    if (bypassStripe) {
      // DEMO MODE: Skip Stripe, create booking directly as paid
      logger.info(`[DEMO MODE] Bypassing Stripe payment for game booking ${bookingId}`);
      stripeSessionId = `demo_session_${bookingId}`;
      stripePaymentIntentId = `demo_payment_${bookingId}`;
      bookingStatus = "Paid";
    } else {
      // NORMAL MODE: Create Stripe session
      session = await stripe.checkout.sessions.create({
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
          bookingId: bookingId.toString(),
          userId: userId.toString(),
          gameId: (game._id as mongoose.Types.ObjectId).toString(),
          timeSlotDocId: timeSlotDocId.toString(),
          slotId: slotId.toString(),
        },

        success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      });

      stripeSessionId = session.id;
      bookingStatus = "Pending";
    }

    // Create booking
    booking = await Booking.create({
      _id: bookingId,
      user: userId,
      gameId: game._id as mongoose.Types.ObjectId,

      venueId: game.venue.venueId,
      subVenueId: game.subVenue.subVenueId,
      sport: game.sport,
      coordinates: {
        type: "Point",
        coordinates: game.venue.coordinates.coordinates,
      },

      startTime: game.slot.startTime,
      endTime: game.slot.endTime,
      timeSlotDocId,
      slotId,
      amount: totalPrice,
      currency: "inr",

      stripeSessionId: stripeSessionId,
      stripePaymentIntentId: stripePaymentIntentId,
      status: bookingStatus,
    });

    logger.info(`Game booking created: ${booking._id} [Status: ${bookingStatus}]`);

    // Update game status if in demo mode
    if (bypassStripe) {
      // Update booking status to match webhook behavior
      game.bookingStatus = "Booked";

      // Check if game is now full
      const currentPlayers = game.approvedPlayers.length;
      if (currentPlayers >= game.playersNeeded.max) {
        game.status = "Full";
      }

      await game.save();
      logger.info(`[DEMO MODE] Game ${game._id} status updated: ${game.status}, bookingStatus: ${game.bookingStatus}`);
    }

    if (bypassStripe) {
      // DEMO MODE: Return success without Stripe URL
      res.json({
        success: true,
        message: "Game booking confirmed (Demo mode - payment bypassed)",
        bookingId: booking._id,
        demoMode: true,
        redirectUrl: "/my-bookings", // Frontend should redirect here
        booking: {
          id: booking._id,
          status: booking.status,
          gameId: game._id,
          sport: game.sport,
          startTime: booking.startTime,
          endTime: booking.endTime,
          amount: booking.amount / 100,
        }
      });
    } else {
      // NORMAL MODE: Return Stripe checkout URL
      res.json({
        success: true,
        url: session.url,
        bookingId: booking._id,
      });
    }
  } catch (error) {
    logger.error(`Error in starting game booking: ${error}`);
    // Roolback slot
    await TimeSlot.updateOne(
      { _id: timeSlotDocId, "slots._id": slotId },
      {
        $set: {
          "slots.$.status": "available",
          "slots.$.bookedForSport": null,
        },
      }
    );

    if (booking) {
      await Booking.deleteOne({ _id: booking._id });
    }

    throw new AppError("Failed to start game booking", 500);
  }
});