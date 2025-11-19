import asyncHandler from "express-async-handler";
import {IUserRequest} from "../../middleware/authMiddleware";
import Game from "../../models/gameModels";
import AppError from "../../utils/AppError";

export const getGameById = asyncHandler(async (req: IUserRequest, res) => {
  const { gameId } = req.params;

  const game = await Game.findById(gameId)
    .populate("host", "username email")
    .populate("approvedPlayers", "username email");

  if (!game) throw new AppError("Game not found", 404);

  res.json({
    success: true,
    game,
  });
});
