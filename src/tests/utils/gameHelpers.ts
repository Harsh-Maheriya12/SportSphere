import mongoose from 'mongoose';
import Game from '../../models/gameModels';

// Returns the current join request status for a specific user in a game
const getJoinRequestStatus = async (gameId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<string | null> => {
    const updatedGame = await Game.findById(gameId);
    const reqObj = updatedGame?.joinRequests.find((req: any) => req.user.toString() === userId.toString());
    return reqObj ? reqObj.status : null;
}

// Checks whether a given user is already approved for a specific game
const isPlayerApproved = async (gameId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<boolean> => {
    const updatedGame = await Game.findById(gameId);
    return updatedGame?.approvedPlayers.some((id: mongoose.Types.ObjectId) => id.toString() === userId.toString()) || false;
}

export { getJoinRequestStatus, isPlayerApproved };