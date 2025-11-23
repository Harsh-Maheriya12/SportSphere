// controllers/game/rateVenueAfterGame.ts
import asyncHandler from "express-async-handler";
import AppError from "../../utils/AppError";
import Game from "../../models/gameModels";
import Venue from "../../models/Venue";
import { IUserRequest } from "../../middleware/authMiddleware";
import { Response } from "express";

export const rateVenueAfterGame = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;
  const { rating } = req.body;
  const userId = req.user._id;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError("Rating must be between 1 and 5", 400);
  }

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  // Only allowed after completion
  if (game.status !== "Completed") {
    throw new AppError("You can only rate after completing the game", 400);
  }

  // Only host/approved players
  const allowed =
    game.host.toString() === userId.toString() ||
    game.approvedPlayers.some((p: any) => p.toString() === userId.toString());

  if (!allowed) throw new AppError("Not allowed to rate this venue", 403);

  const venue = await Venue.findById(game.venue.venueId);
  if (!venue) throw new AppError("Venue not found", 404);

  // Check if user already rated this venue
  const existingRatingIndex = venue.ratings.findIndex(
    (r: any) => r.userId.toString() === userId.toString()
  );

  if (existingRatingIndex !== -1) {
    // Update existing rating
    venue.ratings[existingRatingIndex].rating = rating;
  } else {
    // Add new rating
    venue.ratings.push({ userId, rating });
  }

  // Recalculate average rating
  venue.averageRating =
    venue.ratings.reduce((s: number, r: any) => s + r.rating, 0) /
    venue.ratings.length;

  venue.totalRatings = venue.ratings.length;

  await venue.save();

  res.json({
    success: true,
    message: existingRatingIndex !== -1 
      ? "Rating updated successfully!" 
      : "Thanks for rating the venue!",
    averageRating: venue.averageRating,
  });
});

export const completeGame = asyncHandler(
  async (req: IUserRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    const game = await Game.findById(id);
    if (!game) {
      res.status(404).json({ success: false, message: "Game not found" });
      return;
    }

    // Only host can mark completed
    if (game.host.toString() !== req.user._id.toString()) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    // Mark only if end time passed
    const now = new Date();
    if (now < new Date(game.slot.endTime)) {
      res.status(400).json({
        success: false,
        message: "Game cannot be completed before it ends",
      });
      return;
    }

    game.status = "Completed";
    await game.save();

    res.status(200).json({ success: true, message: "Game marked as completed" });
  }
);