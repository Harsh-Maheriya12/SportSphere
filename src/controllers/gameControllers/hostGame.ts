import asyncHandler from "express-async-handler";
import { IUserRequest } from "../../middleware/authMiddleware";
import mongoose from "mongoose";
import AppError from "../../utils/AppError";
import Venue from "../../models/Venue";
import SubVenue from "../../models/SubVenue";
import Game from "../../models/gameModels";

import { slotAvailabilityCheck } from "../../utils/slotAvailabilityCheck";
import { checkNoTimeOverlapForUser } from "../../utils/checkNoTimeOverlapForUser";

// HOST A NEW GAME
export const hostGame = asyncHandler(async (req: IUserRequest, res)  => {
  const user = req.user;

  const {
    sport,
    venueId,
    subVenueId,
    timeSlotDocId,
    slotId,
    description,
    playersNeeded,
  } = req.body;

  // validate input fields
  if (!sport || !venueId || !subVenueId || !timeSlotDocId || !slotId) {
    throw new AppError("Missing required fields", 400);
  }

  if (!playersNeeded || !playersNeeded.min || !playersNeeded.max) {
    throw new AppError("playersNeeded (min/max) are required", 400);
  }

  if (playersNeeded.min > playersNeeded.max) {
    throw new AppError("min players cannot exceed max players", 400);
  }

  // Fetch venue snapshot
  const venue = await Venue.findById(venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  const venueSnapshot = {
    venueId,
    city: venue.city,
    state: venue.state,
    coordinates: {
      type: "Point",
      coordinates: venue.location.coordinates, // [lng, lat]
    },
  };

  // Fetch subVenue snapshot and sport availability check
  const subVenue = await SubVenue.findById(subVenueId);
  if (!subVenue) throw new AppError("SubVenue not found", 404);

  // Check if sport is available in this subVenue
  const sportObj = subVenue.sports.find((s) => s.name === sport);
  if (!sportObj) {
    throw new AppError("This sport is not available on this subVenue", 400);
  }

  const subVenueSnapshot = {
    subVenueId,
    name: subVenue.name,
  };

  // Validate slot availability
  const slot = await slotAvailabilityCheck(timeSlotDocId, slotId, sport);

  const slotPrice =
    slot.prices instanceof Map
      ? slot.prices.get(sport) : slot.prices?.[sport];

  if (slotPrice == null) {
    throw new AppError("Slot does not have a valid price for this sport", 400);
  }

  const slotSnapshot = {
    timeSlotDocId,
    slotId,
    date: slot.startTime.toISOString().split("T")[0],
    startTime: slot.startTime,
    endTime: slot.endTime,
    price: slot.prices.get(sport),
  };

  // approx cost per player calculation
  const approxCostPerPlayer =
    slotSnapshot.price / playersNeeded.max;

  // Check for time overlaps with user's existing games
  await checkNoTimeOverlapForUser(user._id, slotSnapshot.startTime, slotSnapshot.endTime);
  
  // Create Game document (snapshots are stored here)
  const game = await Game.create({
    host: user._id,
    sport,
    description,
    venue: venueSnapshot,
    subVenue: subVenueSnapshot,
    slot: slotSnapshot,
    playersNeeded,

    approvedPlayers: [user._id], // host is already included
    joinRequests: [], // no join requests initially

    approxCostPerPlayer,
    status: "Open",
  });

  res.status(201).json({
    success: true,
    message: "Game hosted successfully",
    game,
  });
});


// CANCEL GAME (by host)
export const cancelGame = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  // Host check
  if (game.host.toString() !== req.user._id.toString()) {
    throw new AppError("Only the host can cancel this game", 403);
  }

  // Must cancel at least 2 hours before game start
  const now = new Date();
  const gameStartTime = new Date(game.slot.startTime);
  const timeDiff = gameStartTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  if (hoursDiff < 2) {
    throw new AppError("Games can only be cancelled at least 2 hours in advance", 400);
  }
  
  // change game status to cancelled
  game.status = "Cancelled"; 
  await game.save();

  res.json({
    success: true,
    message: "Game cancelled successfully",
  });
});


// LEAVE GAME (for approved player)
export const leaveGame = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;
  const playerId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const game = await Game.findById(gameId).session(session);
    if (!game) throw new AppError("Game not found", 404);

    // No one can leave if slot is booked
    if (game.bookingStatus === "Booked") {
      throw new AppError("Cannot leave the game because slot is already booked", 400);
    }
    // Check if user is approved
    const reqObj = game.approvedPlayers.find(
      (p: any) => p.toString() === playerId.toString()
    );

    if (!reqObj) {
      throw new AppError("You are not approved for this game", 400);
    } 

    // Remove from approvedPlayers
    game.approvedPlayers = game.approvedPlayers.filter(
      (p: any) => p.toString() !== playerId.toString()
    );

    // Reopen game if it was full
    if (game.status === "Full" && game.approvedPlayers.length < game.playersNeeded.max) {
      game.status = "Open";
    }

    await game.save({ session });
    await session.commitTransaction();

    res.json({
      success: true,
      message: "You have left the game",
      status: game.status,
    });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});
