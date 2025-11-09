import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Game from '../../models/gameModels';
import User from '../../models/User';
import {
    app,
    request,
    setupTestEnvironment,
    tearDownTestEnvironment,
    clearGameData,
    token,
    mockUserId,
} from '../setupTestEnv';
import { getJoinRequestStatus, isPlayerApproved } from '../utils/gameHelpers';

beforeAll(setupTestEnvironment);
afterAll(tearDownTestEnvironment);
beforeEach(clearGameData);

// Approve Request Tests
describe('POST /api/games/:id/approve/:userId', () => {
    let gameToApprove: any;
    let playerToApproveId: mongoose.Types.ObjectId;
    let hostToken: string;
    let hostUserId: mongoose.Types.ObjectId;

    beforeEach(async () => {
        await User.deleteMany({ email: 'host@example.com' });

        const hostUser = await User.create({ username: 'hostuser', email: 'host@example.com', password: 'password', role: 'user' });
        hostUserId = hostUser._id;
        hostToken = jwt.sign({ userId: hostUserId, role: hostUser.role }, process.env.JWT_SECRET || 'secret');

        playerToApproveId = new mongoose.Types.ObjectId();

        gameToApprove = await Game.create({
            host: hostUserId,
            sport: 'Badminton',
            description: 'Doubles Match',
            playersNeeded: { min: 2, max: 3 },
            approvedPlayers: [hostUserId],
            joinRequests: [{ user: playerToApproveId, status: 'pending', requestedAt: new Date() }],
            timeSlot: { startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000) },
            venueLocation: { type: 'Point', coordinates: [73, 19] },
        });
    });

    // Test: should allow the host to approve a pending join request if the game is not full
    it('should allow the host to approve a pending join request if the game is not full', async () => {
        const res = await request(app)
            .post(`/api/games/${gameToApprove._id}/approve/${playerToApproveId}`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send();

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Request approved');

        expect(await getJoinRequestStatus(gameToApprove._id, playerToApproveId)).toBe('approved');
        expect(await isPlayerApproved(gameToApprove._id, playerToApproveId)).toBe(true);
    });

    // Test: should return 403 if a non-host tries to approve a request
    it('should return 403 if a non-host tries to approve a request', async () => {
        const nonHostToken = token;
        const res = await request(app)
            .post(`/api/games/${gameToApprove._id}/approve/${playerToApproveId}`)
            .set('Authorization', `Bearer ${nonHostToken}`)
            .send();

        expect(res.status).toBe(403);
        expect(res.body.message).toContain('Only host can approve requests');
    });

    // Test: should return 404 if the game does not exist
    it('should return 404 if the game does not exist', async () => {
        const nonExistentGameId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post(`/api/games/${nonExistentGameId}/approve/${playerToApproveId}`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send();
        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Game not found');
    });

    // Test: should return 404 if the join request for the user does not exist
    it('should return 404 if the join request for the user does not exist', async () => {
        const nonRequestingUserId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post(`/api/games/${gameToApprove._id}/approve/${nonRequestingUserId}`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send();
        expect(res.status).toBe(404);
        expect(res.body.message).toContain('Request not found');
    });

    // Test: should return 400 if the join request status is not pending (already approved)
    it('should return 400 if the join request status is not pending (already approved)', async () => {
        const joinReq = gameToApprove.joinRequests.find((r: any) => r.user.toString() === playerToApproveId.toString());
        joinReq.status = 'approved';
        gameToApprove.approvedPlayers.push(playerToApproveId);
        await gameToApprove.save();

        const res = await request(app)
            .post(`/api/games/${gameToApprove._id}/approve/${playerToApproveId}`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send();
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Request is already approved');
    });

    // Test: should return 400 if the game is already full
    it('should return 400 if the game is already full', async () => {
        gameToApprove.approvedPlayers.push(new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId());
        await gameToApprove.save();

        const res = await request(app)
            .post(`/api/games/${gameToApprove._id}/approve/${playerToApproveId}`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send();

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Game is already full');
    });

    // Test: should set game status to "Full" when approving the last player brings it to max capacity
    it('should set game status to "Full" when approving the last player brings it to max capacity', async () => {
        const firstPlayerId = new mongoose.Types.ObjectId();
        gameToApprove.approvedPlayers.push(firstPlayerId);
        await gameToApprove.save();

        const res = await request(app)
            .post(`/api/games/${gameToApprove._id}/approve/${playerToApproveId}`)
            .set('Authorization', `Bearer ${hostToken}`)
            .send();

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Request approved');

        const updatedGame = await Game.findById(gameToApprove._id);
        expect(updatedGame?.status).toBe('Full');
        expect(updatedGame?.approvedPlayers.length).toBe(3);
    });
});