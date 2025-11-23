import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../app'; // Import the configured Express app
import User from '../../models/User';
import { connectDB, disconnectDB } from '../../config/db';
import dotenv from "dotenv";

dotenv.config();

// Mock OTP email verification helpers to always pass during tests
jest.mock('../../utils/EmailAndPwdHelper', () => ({
  isEmailVerified: jest.fn().mockResolvedValue(true),
  sendOtpVerificationMail: jest.fn().mockResolvedValue({ success: true, message: 'OTP sent successfully' }),
  verifyOtp: jest.fn().mockResolvedValue({ success: true }),
  sendPasswordResetOtp: jest.fn().mockResolvedValue({ success: true, message: 'Password reset OTP sent' }),
}));

jest.mock('../../utils/cloudinaryUploader', () => ({
  uploadToCloudinary: jest.fn().mockResolvedValue('http://example.com/photo.jpg'),
}));

jest.mock('groq-sdk', () => {
  return class MockGroq {
    chat = {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '[]' } }]
        })
      }
    };
  };
});

jest.mock('stripe', () => {
  return class MockStripe {
    checkout = {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'sess_123', url: 'http://stripe.com/pay' })
      }
    };
  };
});

describe('/auth', () => {
  let mongoServer: MongoMemoryServer; // Changed from mongod to mongoServer

  // Before all tests, set up the in-memory database
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  // After all tests, clean up
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
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
        .field('username', 'testuser')
        .field('email', 'test@example.com')
        .field('password', 'password123')
        .field('age', 25)
        .field('gender', 'male')
        .field('role', 'player')
        .attach('profilePhoto', 'src/tests/fixtures/test-image.jpg');

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully. Please login to continue.');
    });


    it('should return a 400 error if email already exists', async () => {
      await User.create({
        username: 'existinguser',
        email: 'exists@example.com',
        password: 'password123',
        age: 30,
        gender: 'female',
        profilePhoto: 'http://example.com/photo.jpg'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .field('username', 'anotheruser')
        .field('email', 'exists@example.com')
        .field('password', 'password456')
        .field('age', 22)
        .field('gender', 'male')
        .field('role', 'player')
        .attach('profilePhoto', 'src/tests/fixtures/test-image.jpg');

      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            msg: 'User already exists'
          })
        ])
      );
    });

    it('should fail with validation errors for missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .field('username', 'testuser')
        .field('email', 'test@example.com')
        // Missing password, age, gender, role
        .attach('profilePhoto', 'src/tests/fixtures/test-image.jpg');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should fail if email is not verified', async () => {
      const { isEmailVerified } = require('../../utils/EmailAndPwdHelper');
      isEmailVerified.mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/auth/register')
        .field('username', 'testuser')
        .field('email', 'unverified@example.com')
        .field('password', 'password123')
        .field('age', 25)
        .field('gender', 'male')
        .field('role', 'player')
        .attach('profilePhoto', 'src/tests/fixtures/test-image.jpg');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Please verify your email with OTP before registering');
    });

    it('should fail if profile photo is missing for local auth', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .field('username', 'testuser')
        .field('email', 'test@example.com')
        .field('password', 'password123')
        .field('age', 25)
        .field('gender', 'male')
        .field('role', 'player');
      // No profile photo attached

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Profile photo is required');
    });

    it('should fail if proof is missing for coach role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .field('username', 'coachuser')
        .field('email', 'coach@example.com')
        .field('password', 'password123')
        .field('age', 30)
        .field('gender', 'male')
        .field('role', 'coach')
        .attach('profilePhoto', 'src/tests/fixtures/test-image.jpg');
      // No proof document attached

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Proof document is required for coach and venue-owner roles');
    });
  });

  // Test suite for the POST /login endpoint
  describe('POST /login', () => {
    beforeEach(async () => {
      const user = new User({
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123',
        authProvider: 'local',
        age: 28,
        gender: 'other',
        profilePhoto: 'http://example.com/photo.jpg'
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

    it('should return error for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('Validation Error Tests', () => {
    describe('POST /send-otp', () => {
      it('should fail without email', async () => {
        const res = await request(app)
          .post('/api/auth/send-otp')
          .send({});

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
      });
    });

    describe('POST /verify-otp', () => {
      it('should fail without email', async () => {
        const res = await request(app)
          .post('/api/auth/verify-otp')
          .send({ otp: '123456' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });

      it('should fail without OTP', async () => {
        const res = await request(app)
          .post('/api/auth/verify-otp')
          .send({ email: 'test@example.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });
    });

    describe('POST /resend-otp', () => {
      it('should fail without email', async () => {
        const res = await request(app)
          .post('/api/auth/resend-otp')
          .send({});

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });
    });

    describe('POST /password-reset/send-otp', () => {
      it('should fail without email', async () => {
        const res = await request(app)
          .post('/api/auth/password-reset/send-otp')
          .send({});

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });
    });

    describe('POST /password-reset/verify-otp', () => {
      it('should fail without email', async () => {
        const res = await request(app)
          .post('/api/auth/password-reset/verify-otp')
          .send({ otp: '123456' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });

      it('should fail without OTP', async () => {
        const res = await request(app)
          .post('/api/auth/password-reset/verify-otp')
          .send({ email: 'test@example.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });
    });

    describe('POST /password-reset/reset', () => {
      it('should fail without email', async () => {
        const res = await request(app)
          .post('/api/auth/password-reset/reset')
          .send({ otp: '123456', newPassword: 'newpass' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });

      it('should fail without OTP', async () => {
        const res = await request(app)
          .post('/api/auth/password-reset/reset')
          .send({ email: 'test@example.com', newPassword: 'newpass' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });

      it('should fail without new password', async () => {
        const res = await request(app)
          .post('/api/auth/password-reset/reset')
          .send({ email: 'test@example.com', otp: '123456' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });

      it('should fail for non-existent user', async () => {
        const { verifyOtp } = require('../../utils/EmailAndPwdHelper');
        verifyOtp.mockResolvedValueOnce({ success: true, verified: true });

        const res = await request(app)
          .post('/api/auth/password-reset/reset')
          .send({
            email: 'nonexistent@example.com',
            otp: '123456',
            newPassword: 'newpassword123'
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message', 'User not found');
      });
    });
  });

  describe('POST /check-username', () => {
    it('should return available for new username', async () => {
      const res = await request(app)
        .post('/api/auth/check-username')
        .send({ username: 'newuser' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('available', true);
    });

    it('should return unavailable for existing username', async () => {
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123',
        age: 25,
        gender: 'male',
        profilePhoto: 'http://example.com/photo.jpg'
      });

      const res = await request(app)
        .post('/api/auth/check-username')
        .send({ username: 'existinguser' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('available', false);
    });
  });

  describe('POST /check-email', () => {
    it('should return available for new email', async () => {
      const res = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'newemail@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('available', true);
    });

    it('should return unavailable for existing email', async () => {
      await User.create({
        username: 'testuser',
        email: 'existing@example.com',
        password: 'password123',
        age: 25,
        gender: 'male',
        profilePhoto: 'http://example.com/photo.jpg'
      });

      const res = await request(app)
        .post('/api/auth/check-email')
        .send({ email: 'existing@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('available', false);
    });
  });

  describe('POST /send-otp', () => {
    it('should send OTP for email verification', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'test@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('POST /verify-otp', () => {
    it('should verify OTP successfully', async () => {
      const { verifyOtp } = require('../../utils/EmailAndPwdHelper');
      verifyOtp.mockResolvedValueOnce({ success: true });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: '123456' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
    });

    it('should fail with invalid OTP', async () => {
      const { verifyOtp } = require('../../utils/EmailAndPwdHelper');
      verifyOtp.mockResolvedValueOnce({ success: false, message: 'Invalid OTP' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ email: 'test@example.com', otp: 'wrong' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /resend-otp', () => {
    it('should resend OTP', async () => {
      const res = await request(app)
        .post('/api/auth/resend-otp')
        .send({ email: 'test@example.com' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  describe('Password Reset Flow', () => {
    describe('POST /send-password-reset-otp', () => {
      it('should send password reset OTP for existing user', async () => {
        await User.create({
          username: 'resetuser',
          email: 'reset@example.com',
          password: 'oldpassword',
          age: 25,
          gender: 'male',
          profilePhoto: 'http://example.com/photo.jpg'
        });

        const res = await request(app)
          .post('/api/auth/password-reset/send-otp')
          .send({ email: 'reset@example.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', true);
      });

      it('should fail for non-existent user', async () => {
        const { sendPasswordResetOtp } = require('../../utils/EmailAndPwdHelper');
        sendPasswordResetOtp.mockResolvedValueOnce({ success: false, message: 'User not found' });

        const res = await request(app)
          .post('/api/auth/password-reset/send-otp')
          .send({ email: 'nonexistent@example.com' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
        expect(res.body).toHaveProperty('message');
      });
    });

    describe('POST /verify-password-reset-otp', () => {
      it('should verify password reset OTP', async () => {
        const { verifyOtp } = require('../../utils/EmailAndPwdHelper');
        verifyOtp.mockResolvedValueOnce({ success: true });

        const res = await request(app)
          .post('/api/auth/password-reset/verify-otp')
          .send({ email: 'reset@example.com', otp: '123456' });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', true);
      });
    });

    describe('POST /reset-password', () => {
      it('should reset password with valid OTP', async () => {
        const { verifyOtp } = require('../../utils/EmailAndPwdHelper');
        verifyOtp.mockResolvedValueOnce({ success: true, verified: true });

        await User.create({
          username: 'resetuser',
          email: 'reset@example.com',
          password: 'oldpassword',
          age: 25,
          gender: 'male',
          profilePhoto: 'http://example.com/photo.jpg'
        });

        const res = await request(app)
          .post('/api/auth/password-reset/reset')
          .send({
            email: 'reset@example.com',
            otp: '123456',
            newPassword: 'newpassword123'
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', 'Password reset successful');
      });

      it('should fail with invalid OTP', async () => {
        const { verifyOtp } = require('../../utils/EmailAndPwdHelper');
        verifyOtp.mockResolvedValueOnce({ success: false, verified: false, message: 'Invalid OTP' });

        const res = await request(app)
          .post('/api/auth/password-reset/reset')
          .send({
            email: 'reset@example.com',
            otp: 'wrong',
            newPassword: 'newpassword123'
          });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', false);
      });
    });
  });
});
