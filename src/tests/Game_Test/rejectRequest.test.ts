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

// Reject Request Tests
describe('POST /api/games/:id/reject/:userId', () => {
  let gameToReject: any;
  let playerToRejectId: mongoose.Types.ObjectId;
  let hostTokenReject: string;
  let hostUserIdReject: mongoose.Types.ObjectId;

  beforeEach(async () => {
    await User.deleteMany({ email: 'reject@example.com' });

    const hostUserReject = await User.create({ username: 'rejecthost', email: 'reject@example.com', password: 'password', role: 'user' });
    hostUserIdReject = hostUserReject._id;
    hostTokenReject = jwt.sign({ userId: hostUserIdReject, role: hostUserReject.role }, process.env.JWT_SECRET || 'secret');

    playerToRejectId = new mongoose.Types.ObjectId();

    gameToReject = await Game.create({
      host: hostUserIdReject,
      sport: 'Hockey',
      description: 'Reject Test Game',
      playersNeeded: { min: 5, max: 10 },
      approvedPlayers: [hostUserIdReject],
      joinRequests: [{ user: playerToRejectId, status: 'pending', requestedAt: new Date() }],
      timeSlot: { startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 90000000) },
      venueLocation: { type: 'Point', coordinates: [74, 20] },
    });
  });

  // Test: should allow the host to reject a pending join request
  it('should allow the host to reject a pending join request', async () => {
    const res = await request(app)
      .post(`/api/games/${gameToReject._id}/reject/${playerToRejectId}`)
      .set('Authorization', `Bearer ${hostTokenReject}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Request rejected');

    expect(await getJoinRequestStatus(gameToReject._id, playerToRejectId)).toBe('rejected');
    expect(await isPlayerApproved(gameToReject._id, playerToRejectId)).toBe(false);
  });

  // Test: should return 403 if a non-host tries to reject a request
  it('should return 403 if a non-host tries to reject a request', async () => {
    const nonHostToken = token;
    const res = await request(app)
      .post(`/api/games/${gameToReject._id}/reject/${playerToRejectId}`)
      .set('Authorization', `Bearer ${nonHostToken}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Only the host can reject requests');
  });

  // Test: should return 404 if the game does not exist
  it('should return 404 if the game does not exist', async () => {
    const nonExistentGameId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/games/${nonExistentGameId}/reject/${playerToRejectId}`)
      .set('Authorization', `Bearer ${hostTokenReject}`)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Game not found');
  });

  // Test: should return 404 if the join request for the user does not exist
  it('should return 404 if the join request for the user does not exist', async () => {
    const nonRequestingUserId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/games/${gameToReject._id}/reject/${nonRequestingUserId}`)
      .set('Authorization', `Bearer ${hostTokenReject}`)
      .send();
    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Request not found');
  });

  // Test: should return 400 if the join request status is not pending (already rejected)
  it('should return 400 if the join request status is not pending (already rejected)', async () => {
    const joinReq = gameToReject.joinRequests.find((r: any) => r.user.toString() === playerToRejectId.toString());
    joinReq.status = 'rejected';
    await gameToReject.save();

    const res = await request(app)
      .post(`/api/games/${gameToReject._id}/reject/${playerToRejectId}`)
      .set('Authorization', `Bearer ${hostTokenReject}`)
      .send();
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Request is already rejected');
  });

  // Test: should return 400 if the join request status is not pending (already approved)
  it('should return 400 if the join request status is not pending (already approved)', async () => {
    const joinReq = gameToReject.joinRequests.find((r: any) => r.user.toString() === playerToRejectId.toString());
    joinReq.status = 'approved';
    gameToReject.approvedPlayers.push(playerToRejectId);
    await gameToReject.save();

    const res = await request(app)
      .post(`/api/games/${gameToReject._id}/reject/${playerToRejectId}`)
      .set('Authorization', `Bearer ${hostTokenReject}`)
      .send();
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Request is already approved');
  });
});