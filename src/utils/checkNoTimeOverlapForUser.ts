import AppError from "./AppError";
import Game from "../models/gameModels";

export const checkNoTimeOverlapForUser = async (userId: string|any,startTime:Date, endTime:Date) => {
  
  // Find games the user is already in
  const overlappingGames = await Game.find({
    approvedPlayers: userId,
    "slot.startTime": { $lt: endTime },   // game starts before new game ends
    "slot.endTime": { $gt: startTime },   // game ends after new game starts
    status: { $in: ["Open", "Full"] } // only consider active games
  });

  if (overlappingGames.length > 0) {
    throw  new AppError("You already have a game overlapping with this slot.", 400)
  }

  return true;
};
