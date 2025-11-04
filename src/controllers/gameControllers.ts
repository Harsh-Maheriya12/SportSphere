import { Request, Response, NextFunction } from 'express';

import { IUserRequest } from '../middleware/authMiddleware'; // custom req type with user

/*
@desc    Create a new game
@route   POST /api/games
@access  Private (Host only)
*/

export const createGame = async(req: IUserRequest, res: Response) => {
    // Logic to create a game 
};

/*
@desc    Get all open games
@route   GET /api/games
@access  Private (Players)
*/
export const getGames = async(req: IUserRequest, res: Response) => {
    // Logic to fetch games
};

/*
@desc    Join a game
@route   POST /api/games/:id/join
@access  Private (Players)
*/
export const joinGame = async(req: IUserRequest, res: Response) => {
    // Logic to join a game
};

/*
@desc    Approve a join request
@route   POST /api/games/:id/approve/:userId
@access  Private (Host only)
*/
export const approveRequest = async(req: IUserRequest, res: Response) => {
    // Logic to approve a join request
};

/*
@desc    Reject a join request
@route   POST /api/games/:id/reject/:userId
@access  Private (Host only)
*/
export const rejectRequest = async(req: IUserRequest, res: Response) => {
    // Logic to reject a join request
};