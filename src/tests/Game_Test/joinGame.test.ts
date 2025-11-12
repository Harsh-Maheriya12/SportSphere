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

beforeAll(setupTestEnvironment);
afterAll(tearDownTestEnvironment);
beforeEach(clearGameData);

// Join Game Tests
describe('POST /api/games/:id/join', () => {
  let game: any;
  const hostId = new mongoose.Types.ObjectId(); 
  beforeEach(async () => {
    game = await Game.create({
      host: hostId,
      sport: 'Tennis',
      description: 'Friendly match for join tests',
      playersNeeded: { min: 2, max: 4 },
      timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
      venueLocation: { type: 'Point', coordinates: [72, 18] },
      approxCostPerPlayer: 20,
      joinRequests: [],
      approvedPlayers: [hostId]
    });
  });

  // Test: should allow an authenticated user to send a join request to an open game
  it('should allow an authenticated user to send a join request to an open game', async () => {
    const res = await request(app)
      .post(`/api/games/${game._id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Join request sent');

    const updatedGame = await Game.findById(game._id);
    expect(updatedGame?.joinRequests).toHaveLength(1);
    expect(updatedGame?.joinRequests[0].user.toString()).toBe(mockUserId.toString());
    expect(updatedGame?.joinRequests[0].status).toBe('pending');
  });

  // Test: should return 400 if the user tries to join their own game
  it('should return 400 if the user tries to join their own game', async () => {
    const ownGame = await Game.create({
      host: mockUserId,
      sport: 'Squash',
      description: 'Own game test',
      playersNeeded: { min: 2, max: 2 },
      timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
      venueLocation: { type: 'Point', coordinates: [72.1, 18.1] },
    });

    const res = await request(app)
      .post(`/api/games/${ownGame._id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(400);
  });

  // Test: should return 404 if the game ID does not exist
  it('should return 404 if the game ID does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/games/${nonExistentId}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('Game not found');
  });

  // Test: should return 400 or 500 for an invalid game ID format
  it('should return 400 or 500 for an invalid game ID format', async () => {
    const invalidId = 'invalid-id-format';
    const res = await request(app)
      .post(`/api/games/${invalidId}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // Test: should return 400 if the game status is not Open
  it('should return 400 if the game status is not Open', async () => {
    game.status = 'Full';
    await game.save();

    const res = await request(app)
      .post(`/api/games/${game._id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Game is not open for join requests');
  });

  // Test: should return 400 if the user has already sent a join request
  it('should return 400 if the user has already sent a join request', async () => {
    game.joinRequests.push({ user: mockUserId, status: 'pending', requestedAt: new Date() });
    await game.save();

    const res = await request(app)
      .post(`/api/games/${game._id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Already requested to join');
  });

  // Test: should return 400 if the user is already an approved player
  it('should return 400 if the user is already an approved player', async () => {
    game.approvedPlayers.push(mockUserId);
    await game.save();

    const res = await request(app)
      .post(`/api/games/${game._id}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('You are already a participant');
  });

  // Test: should return 401 if no authentication token is provided when joining
  it('should return 401 if no authentication token is provided when joining', async () => {
    const res = await request(app)
      .post(`/api/games/${game._id}/join`)
      .send();
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Not authorized, no token');
  });

  // Test: should return 401 if an invalid authentication token is provided when joining
  it('should return 401 if an invalid authentication token is provided when joining', async () => {
    const res = await request(app)
      .post(`/api/games/${game._id}/join`)
      .set('Authorization', `Bearer invalidtoken123`)
      .send();
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Not authorized, token failed');
  });

});