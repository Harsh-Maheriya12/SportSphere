import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app'; // Import the configured Express app
import User from '../../models/User';
import {connectDB , disconnectDB } from '../../config/db';
import dotenv from "dotenv";

dotenv.config();

// Mock OTP email verification helpers to always pass during tests
jest.mock('../../controllers/emailHelper', () => ({
  isEmailVerified: jest.fn().mockResolvedValue(true),
  sendOtpVerificationMail: jest.fn(),
  verifyOtp: jest.fn(),
}));

describe('/auth', () => {
  let mongod: MongoMemoryServer;

  // Before all tests, set up the in-memory database
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    await connectDB();
  }, 20000);

  // After all tests, clean up
  afterAll(async () => {
    await disconnectDB();
    await mongod.stop();
  });

  // Before each test, clear the user collection
  beforeEach(async () => {
    await User.deleteMany({});
  });

  // Test suite for the POST /register endpoint
  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });
      
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully. Please login to continue.');
    });

    
    it('should return a 400 error if email already exists', async () => {
      await User.create({
        username: 'existinguser',
        email: 'exists@example.com',
        password: 'password123',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotheruser',
          email: 'exists@example.com',
          password: 'password456',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: 'User already exists'
          })
        ])
      );
    });
  });

  // Test suite for the POST /login endpoint
  describe('POST /login', () => {
    beforeEach(async () => {
      const user = new User({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123',
        authProvider: 'local'
      });
      await user.save();
    });
  
    it('should log in a user with correct credentials and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return a 400 error for an incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Invalid credentials');
    });
  });
});
