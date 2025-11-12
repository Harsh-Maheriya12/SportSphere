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

describe('Game Controller Tests', () => {

  // Create Game Tests
  describe('POST /api/games', () => {
    // Test: should create a new game successfully with valid data
    it('should create a new game successfully with valid data', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Football',
          description: 'Evening match',
          playersNeeded: { min: 1, max: 2 },
          timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
          venueLocation: { type: 'Point', coordinates: [72.87, 19.07] },
          approxCostPerPlayer: 100
        });

      // Assertions for a successful creation
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.game.sport).toBe('Football');
      expect(res.body.game.host).toBe(mockUserId.toString());
    });

    // Test: should return 403 when a coach tries to create a game (coaches forbidden)
    it('should return 403 when a coach tries to create a game', async () => {
      // Create a coach user
      const coachUser = await User.create({
        username: 'coachuser',
        email: 'coach@example.com',
        password: 'hashedpassword',
        role: 'coach'
      });

      // Generate token for the coach
      const coachToken = jwt.sign(
        { userId: coachUser._id, role: 'coach' },
        process.env.JWT_SECRET || 'secret'
      );

      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${coachToken}`)
        .send({
          sport: 'Basketball',
          description: 'Coach trying to create game',
          playersNeeded: { min: 5, max: 10 },
          timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
          venueLocation: { type: 'Point', coordinates: [72.88, 19.08] },
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to perform this action');
    });

    // Test: should return 401 if no authentication token is provided
    it('should return 401 if no authentication token is provided', async () => {
      const res = await request(app)
        .post('/api/games')
        .send({
          sport: 'Chess',
          description: 'Unauthorized test',
          playersNeeded: { min: 2, max: 2 },
          timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
          venueLocation: { type: 'Point', coordinates: [0, 0] },
        });
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Not authorized, no token');
    });

    // Test: should return 403 for invalid token
    it('should return 403 for invalid token', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', 'Bearer invalidtoken')
        .send({
          sport: 'Basketball',
          description: 'Fake token test',
          playersNeeded: { min: 3, max: 6 },
          timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
          venueLocation: { type: 'Point', coordinates: [72.8, 19.05] },
          approxCostPerPlayer: 120
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch("Not authorized, token failed");
    });

    // Test: should return 400 when timeSlot is explicitly null or undefined
    it('should return 400 when timeSlot is explicitly null or undefined', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Soccer',
          description: 'Test game with null timeSlot',
          playersNeeded: { min: 5, max: 10 },
          timeSlot: null, // Explicitly null - caught by validateGameInput middleware
          venueLocation: { type: 'Point', coordinates: [72.9, 19.1] },
          approxCostPerPlayer: 100
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing required fields');
    });

    // Test: should return 400 with "Time slot is required" when timeSlot is an empty object
    it('should return 400 with "Time slot is required" when timeSlot is an empty object', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Basketball',
          description: 'Test game with empty timeSlot object',
          playersNeeded: { min: 3, max: 5 },
          timeSlot: {}, // Empty object - passes validateGameInput but fails in checkTimeSlotConflict
          venueLocation: { type: 'Point', coordinates: [72.9, 19.1] },
          approxCostPerPlayer: 150
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid timeSlot');
    });

    // Test: should return 400 if required fields (like description, playersNeeded) are missing
    it('should return 400 if required fields (like description, playersNeeded) are missing', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Cricket', // Missing description, playersNeeded, etc.
          timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) }
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing required fields');
    });

    // Test: should return 500 or validation error for invalid data types of playersNeeded
    it('should return 500 or validation error for invalid data types of playersNeeded', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Basketball',
          description: 'Invalid players needed',
          playersNeeded: { min: "five", max: "ten" },
          timeSlot: { startTime: new Date(), endTime: new Date(Date.now() + 3600000) },
          venueLocation: { type: 'Point', coordinates: [72.8, 19.0] },
          approxCostPerPlayer: 50
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.message).toContain('playersNeeded.min and playersNeeded.max must be numbers');
    });

    // Test: should return 400 when venueLocation is null
    it('should return 400 when venueLocation is null', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Tennis',
          description: 'Test with null venueLocation',
          playersNeeded: { min: 2, max: 4 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: null,
          approxCostPerPlayer: 100
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing required fields');
    });

    // Test: should return 400 when venueLocation is not an object (primitive type like string)
    it('should return 400 when venueLocation is a string instead of an object', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Basketball',
          description: 'Test with string venueLocation',
          playersNeeded: { min: 3, max: 5 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: 'Central Park', // String instead of object
          approxCostPerPlayer: 50
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('venueLocation must be a GeoJSON Point object');
    });

    // Test: should return 400 when venueLocation.type is not 'Point'
    it('should return 400 when venueLocation.type is not Point', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Soccer',
          description: 'Test with wrong venueLocation type',
          playersNeeded: { min: 5, max: 10 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: { type: 'Polygon', coordinates: [72.8, 19.0] },
          approxCostPerPlayer: 80
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("venueLocation.type must be 'Point'");
    });

    // Test: should return 400 when venueLocation.coordinates is not an array
    it('should return 400 when venueLocation.coordinates is not an array', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Cricket',
          description: 'Test with non-array coordinates',
          playersNeeded: { min: 4, max: 8 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: { type: 'Point', coordinates: "72.8, 19.0" },
          approxCostPerPlayer: 60
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('venueLocation.coordinates must be an array of [lng, lat]');
    });

    // Test: should return 400 when venueLocation.coordinates has wrong length
    it('should return 400 when venueLocation.coordinates has wrong length', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Badminton',
          description: 'Test with incomplete coordinates',
          playersNeeded: { min: 2, max: 4 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: { type: 'Point', coordinates: [72.8] },
          approxCostPerPlayer: 50
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('venueLocation.coordinates must be an array of [lng, lat]');
    });

    // Test: should return 400 when venueLocation.coordinates contains non-numbers
    it('should return 400 when venueLocation.coordinates contains non-numbers', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Volleyball',
          description: 'Test with string coordinates',
          playersNeeded: { min: 6, max: 12 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: { type: 'Point', coordinates: ["72.8", "19.0"] },
          approxCostPerPlayer: 70
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('venueLocation.coordinates must contain numbers [lng, lat]');
    });

    // Test: should return 400 when venueLocation coordinates are out of valid range
    it('should return 400 when venueLocation coordinates are out of valid range', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Rugby',
          description: 'Test with out-of-range coordinates',
          playersNeeded: { min: 10, max: 15 },
          timeSlot: { startTime: new Date(Date.now() + 3600000), endTime: new Date(Date.now() + 7200000) },
          venueLocation: { type: 'Point', coordinates: [200, 100] },
          approxCostPerPlayer: 90
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('venueLocation coordinates out of range');
    });

    // Test: should return 400 for invalid time slot (end before start)
    it('should return 400 for invalid time slot (end before start)', async () => {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() - 3600000);
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Volleyball',
          description: 'Invalid time test',
          playersNeeded: { min: 6, max: 12 },
          timeSlot: { startTime, endTime },
          venueLocation: { type: 'Point', coordinates: [72.9, 19.1] },
          approxCostPerPlayer: 80
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid timeSlot');
    });

    // Test: should return 400 for invalid date values in timeSlot
    it('should return 400 for invalid date values in timeSlot', async () => {
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Swimming',
          description: 'Invalid date test',
          playersNeeded: { min: 4, max: 8 },
          timeSlot: { startTime: 'invalid-date', endTime: 'also-invalid' },
          venueLocation: { type: 'Point', coordinates: [72.85, 19.05] },
          approxCostPerPlayer: 100
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid timeSlot');
    });

    // Test: should return 400 for a game scheduled in the past
    it('should return 400 for a game scheduled in the past', async () => {
      const pastStartTime = new Date(Date.now() - 7200000);
      const pastEndTime = new Date(Date.now() - 3600000);
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Hockey',
          description: 'Past game test',
          playersNeeded: { min: 8, max: 16 },
          timeSlot: { startTime: pastStartTime, endTime: pastEndTime },
          venueLocation: { type: 'Point', coordinates: [73.1, 19.2] },
          approxCostPerPlayer: 120
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Time slot cannot be in the past');
    });

    // Test: should return 400 if the host already has a game in the same time slot
    it('should return 400 if the host already has a game in the same time slot', async () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 3600000);

      // Create the first game
      await Game.create({
        host: mockUserId,
        sport: 'Badminton',
        description: 'First game',
        playersNeeded: { min: 2, max: 4 },
        timeSlot: { startTime, endTime },
        venueLocation: { type: 'Point', coordinates: [73, 19] },
      });

      // Attempt to create the second game overlapping the first
      const res = await request(app)
        .post('/api/games')
        .set('Authorization', `Bearer ${token}`)
        .send({
          sport: 'Table Tennis',
          description: 'Conflicting game',
          playersNeeded: { min: 2, max: 2 },
          timeSlot: { startTime, endTime },
          venueLocation: { type: 'Point', coordinates: [73.1, 19.1] },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('You already have a game scheduled in this time slot');
    });
  });
});