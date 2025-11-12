import { Request, Response, NextFunction } from 'express';
import Game from '../models/gameModels';
import { IUserRequest } from '../middleware/authMiddleware'; // Custom type that extends Express.Request with authenticated user info
import mongoose from 'mongoose';

/*
@desc    Create a new game hosted by the logged-in user
@route   POST /api/games    
@access  Private (Host only)
*/

export const createGame = async (req: IUserRequest, res: Response) => {
    try {
        // Destructure the necessary fields from the incoming request body representing all the data required to host a new game.
        const { sport, description, playersNeeded, timeSlot, venueLocation, approxCostPerPlayer } = req.body;

        // Create a new Game document using the data provided in the request body.
        // The host is automatically set to the logged-in user's ID (from req.user).
        const game = await Game.create({
            host: req.user._id,
            sport,
            description,
            playersNeeded,
            timeSlot,
            venueLocation,
            approxCostPerPlayer,
            approvedPlayers: [req.user._id],
        });

        // Send back the created game with a 201 Created status.
        return res.status(201).json({ success: true, game });
    } catch (error: any) {
        // Generic fallback for unexpected server-side errors.
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

/*
@desc    Fetch all open games available for joining
@route   GET /api/games
@access  Private (Players)
*/
export const getGames = async (req: IUserRequest, res: Response) => {
    try {
        // Query all games that are currently open for players to join.
        const games = await Game.find({ status: 'Open' })
            .populate('host', 'username role')            // Populate host info (only fetch 'username' and 'role' fields)
            .populate('approvedPlayers', 'username')      // Populate the approved players list for clarity
            .sort({ createdAt: -1 });                     // Sort results in descending order (newest games appear first).

        // Respond with a list of all open games.
        return res.status(200).json({ success: true, games });
    } catch (error: any) {
        // Generic fallback for unexpected server-side errors.
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

/*
@desc    Send a join request to a specific game
@route   POST /api/games/:id/join
@access  Private (Players)
*/
export const joinGame = async (req: IUserRequest, res: Response) => {
    try {
        // Find the game by ID provided in the request URL.
        const game = await Game.findById(req.params.id);

        // If no game is found with that ID, respond with a 404 error.
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        // Prevent the host from joining their own game.
        if (game.host.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot join your own game' });
        }

        // Only allow joining if the game is currently open.
        if (game.status !== 'Open') {
            return res.status(400).json({ success: false, message: 'Game is not open for join requests' });
        }

        // Disallow joining if the user is already approved.
        const alreadyApproved = game.approvedPlayers.some((id: any) => id.toString() === req.user._id.toString());
        if (alreadyApproved) {
            return res.status(400).json({ success: false, message: 'You are already a participant' });
        }

        // Disallow duplicate join requests.
        const alreadyRequested = game.joinRequests.some(reqObj =>
            reqObj.user.toString() === req.user._id.toString()
        );
        if (alreadyRequested) return res.status(400).json({ success: false, message: 'Already requested to join' });

        // Add a new join request to the game's joinRequests array.
        game.joinRequests.push({ 
            user: req.user._id, 
            status: 'pending', 
            requestedAt: new Date() 
        });

        // Save the game document to persist the change.
        await game.save();
        
        // Respond with success message.
        return res.status(200).json({ success: true, message: 'Join request sent successfully' });
    } catch (error: any) {
        // Generic fallback for unexpected server-side errors.
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

/*
@desc    Approve a player's join request
@route   POST /api/games/:id/approve/:userId
@access  Private (Host only)
*/
export const approveRequest = async (req: IUserRequest, res: Response) => {
    try {
        const { id, userId } = req.params;

        // Retrieve the game document for validation and modification.
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        // Ensure that the currently logged-in user is the host of this game.
        if (game.host.toString() !== req.user._id.toString()) {
            //  Only the game host is authorized to approve players.
            return res.status(403).json({ success: false, message: 'Only host can approve requests' });
        }

        // Prevent approval if the game is already full.
        if (game.approvedPlayers.length >= game.playersNeeded.max) {
            return res.status(400).json({ success: false, message: 'Game is already full. Cannot approve more players.' });
        }

        // Locate the join request corresponding to the specified userId.
        const joinReq = game.joinRequests.find(r => r.user.toString() === userId);
        if (!joinReq){
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        // Only allow approval of pending requests.
        if (joinReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request is already ${joinReq.status}` });
        }

        // Update request status and move the player to approvedPlayers.
        joinReq.status = 'approved';
        game.approvedPlayers.push(new mongoose.Types.ObjectId(userId));

        // Check if the game is now full after this approval.
        if (game.approvedPlayers.length >= game.playersNeeded.max) {
            game.status = 'Full'; // Update game status to 'Full' if max players reached.
        }

        // Persist the changes.
        await game.save();

        // Respond with success message.
        return res.status(200).json({ success: true, message: 'Request approved' });
    } catch (error: any) {
        // Generic fallback for unexpected server-side errors.
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

/*
@desc    Reject a player's join request
@route   POST /api/games/:id/reject/:userId
@access  Private (Host only)
*/
export const rejectRequest = async (req: IUserRequest, res: Response) => {
    try {
        const { id, userId } = req.params;

        // Retrieve the game document for validation and modification.
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        // Ensure only the host can reject requests.
        if (game.host.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the host can reject requests' });
        }

        // Locate the join request to reject.
        const joinReq = game.joinRequests.find(r => r.user.toString() === userId);
        if (!joinReq) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        // Allow rejection only if the request is still pending.
        if (joinReq.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Request is already ${joinReq.status}` });
        }

        // Update the status to 'rejected'.
        joinReq.status = 'rejected';

        // Persist the change.
        await game.save();

        // Respond with success message.
        return res.status(200).json({ success: true, message: 'Request rejected' });

    } catch (error: any) {
        // Generic fallback for unexpected server-side errors.
        console.error("Error rejecting request:", error);
        return res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};