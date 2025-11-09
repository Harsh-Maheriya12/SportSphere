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

// Get Games Tests
describe('GET /api/games', () => {
  // Test: should return open games successfully
  it('should return open games successfully', async () => {
    // Create a sample game to be fetched
    await Game.create({
      host: mockUserId,
      sport: 'Cricket',
      description: 'Morning match',
      playersNeeded: { min: 4, max: 8 },
      timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
      venueLocation: { type: 'Point', coordinates: [73, 19] },
      approxCostPerPlayer: 50,
      status: 'Open'
    });
    // Create another game that is not open
    await Game.create({
      host: mockUserId,
      sport: 'Football',
      description: 'Full match',
      playersNeeded: { min: 10, max: 10 },
      timeSlot: { startTime: new Date(Date.now() + 7200000), endTime: new Date(Date.now() + 10800000) },
      venueLocation: { type: 'Point', coordinates: [74, 20] },
      status: 'Full'
    });

    const res = await request(app)
      .get('/api/games')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.games)).toBe(true);
    expect(res.body.games.length).toBe(1);
    expect(res.body.games[0].sport).toBe('Cricket');
    expect(res.body.games[0].status).toBe('Open');
  });

  // Test: should return an empty array if no open games exist
  it('should return an empty array if no open games exist', async () => {
    // Create a valid game with status 'Full' so there are no 'Open' games
    await Game.create({
      host: mockUserId,
      sport: 'Rugby',
      description: 'Full match',
      playersNeeded: { min: 10, max: 10 },
      timeSlot: { startTime: new Date(Date.now() + 7200000), endTime: new Date(Date.now() + 10800000) },
      venueLocation: { type: 'Point', coordinates: [75, 21] },
      status: 'Full'
    });

    const res = await request(app)
      .get('/api/games')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.games).toEqual([]);
  });
});