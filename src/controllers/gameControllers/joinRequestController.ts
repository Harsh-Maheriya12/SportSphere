import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { IUserRequest } from "../../middleware/authMiddleware";
import AppError from "../../utils/AppError";
import Game from "../../models/gameModels";
import { checkNoTimeOverlapForUser } from "../../utils/checkNoTimeOverlapForUser";

// Helper to find join request object
function getJoinRequest(game: any, userId: any) {
  return game.joinRequests.find(
    (jr: any) => jr.user.toString() === userId.toString()
  );
}

// CREATE JOIN REQUEST
export const createJoinRequest = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;
  const user = req.user;

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  // Cannot join own game
  if (game.host.toString() === user._id.toString()) {
    throw new AppError("Host cannot join their own game", 400);
  }

  // Game must be open
  if (game.status !== "Open") {
    throw new AppError("Cannot join a closed/cancelled game", 400);
  }

  // Cannot join after start time
  if (new Date(game.slot.startTime) <= new Date()) {
    throw new AppError("Game already started", 400);
  }

  // Existing join request
  const existingRequest = getJoinRequest(game, user._id);
  if (existingRequest) {
    if (existingRequest.status === "pending")
      throw new AppError("Join request already pending", 400);
    if (existingRequest.status === "approved")
      throw new AppError("Already approved for this game", 400);
    if (existingRequest.status === "rejected")
      throw new AppError("Join request was rejected previously", 400);
  }

  // Check overlapping time slot
  await checkNoTimeOverlapForUser(user._id, game.slot.startTime, game.slot.endTime);

  // Create new join request
  game.joinRequests.push({
    user: user._id,
    status: "pending",
    requestedAt: new Date(),
  });

  await game.save();

  res.status(201).json({
    success: true,
    message: "Join request created",
  });
});


// APPROVE JOIN REQUEST
export const approveJoinRequest = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId, playerId } = req.params;
  const hostId = req.user._id;

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  // Host check
  if (game.host.toString() !== hostId.toString()) {
    throw new AppError("Only host can approve join requests", 403);
  }

  if(game.status !== "Open") {
    throw new AppError("Cannot approve join requests for closed/cancelled/completed games", 400);
  }

  if(new Date(game.slot.startTime) <= new Date()) {
    throw new AppError("Cannot approve join requests for games that have already started", 400);
  }

  const jr = getJoinRequest(game, playerId);
  if (!jr) {
    throw new AppError("Join request not found", 404);
  }
  if (jr.status !== "pending") {
    throw new AppError("Already processed join request", 400);
  }

  // Capacity check
  if (game.approvedPlayers.length >= game.playersNeeded.max) {
    throw new AppError("Game is already full", 400);
  }

  // Time overlapping check for player
  await checkNoTimeOverlapForUser(playerId, new Date(game.slot.startTime), new Date(game.slot.endTime));

  // Approve
  jr.status = "approved";

  if (!game.approvedPlayers.find(
    (p: any) => p.toString() === playerId.toString())
  ){
    game.approvedPlayers.push(new mongoose.Types.ObjectId(playerId));
  }

  // Update status if full
  if (game.approvedPlayers.length >= game.playersNeeded.max) {
    game.status = "Full";
  }

  await game.save();

  res.json({
    success: true,
    message: "Player approved",
    currentApprovedPlayers: game.approvedPlayers.length,
    status: game.status,
  });

});


//  REJECT JOIN REQUEST
export const rejectJoinRequest = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId, playerId } = req.params;

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  if (game.host.toString() !== req.user._id.toString()) {
    throw new AppError("Only host can reject join requests", 403);
  } 

  if(game.status !== "Open") {
    throw new AppError("Cannot reject join requests for closed/cancelled/completed games", 400);
  } 
  
  const jr = getJoinRequest(game, playerId);
  if (!jr) {
    throw new AppError("Join request not found", 404);
  }
  if (jr.status !== "pending") {
    throw new AppError("Already processed join request", 400);
  }

  jr.status = "rejected";
  await game.save();

  res.json({
    success: true,
    message: "Join request rejected",
  });
});


// CANCEL JOIN REQUEST (for player)
export const cancelJoinRequest = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;
  const playerId = req.user._id;

  const game = await Game.findById(gameId);
  if (!game) throw new AppError("Game not found", 404);

  const reqObj = getJoinRequest(game, playerId);
  if (!reqObj) {
    throw new AppError("No join request found", 400);
  }

  // Only pending requests can be cancelled
  if (reqObj.status !== "pending") {
    throw new AppError(`Cannot cancel ${reqObj.status} join request`, 400);
  }

  const now = new Date();
  const gameStart = new Date(game.slot.startTime);
  const diffMs = gameStart.getTime() - now.getTime();

  // Must cancel at least 2 hours before game start
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 2) {
    throw new AppError("Cannot cancel join request less than 2 hours before game start", 400);
  }

  // Remove join request from array
  game.joinRequests = game.joinRequests.filter(
    (j: any) => j.user.toString() !== playerId.toString()
  );

  await game.save();

  res.json({
    success: true,
    message: "Join request cancelled",
  });
});

