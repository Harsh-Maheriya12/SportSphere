import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB, disconnectDB } from '../../config/db';
import dotenv from "dotenv";

dotenv.config();

// Mock logger to avoid console output during tests
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('MongoDB Connection Tests', () => {
  let originalMongoUri: string | undefined;

  beforeAll(() => {
    originalMongoUri = process.env.MONGO_URI;
  });

  afterAll(() => {
    process.env.MONGO_URI = originalMongoUri;
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Successful Connection', () => {
    let mongod: MongoMemoryServer;

    beforeAll(async () => {
      await mongoose.disconnect();
      mongod = await MongoMemoryServer.create();
      process.env.MONGO_URI = mongod.getUri();
      await connectDB();
    }, 30000);

    afterAll(async () => {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
      }
      await mongoose.disconnect();
      if (mongod) await mongod.stop();
    });

    beforeEach(async () => {
      if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
          const collection = collections[key];
          await collection.deleteMany({});
        }
      }
    });

    it('should connect to in-memory MongoDB', () => {
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('should insert and retrieve a test document', async () => {
      const TestSchema = new mongoose.Schema({ name: String });
      const TestModel = mongoose.models.Test || mongoose.model('Test', TestSchema);

      const doc = await TestModel.create({ name: 'Test User' });
      const found = await TestModel.findById(doc._id);

      expect(found).not.toBeNull();
      expect(found?.name).toBe('Test User');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await mongoose.disconnect();
    });

    it('should throw error if MONGO_URI is not defined', async () => {
      const originalUri = process.env.MONGO_URI;
      delete process.env.MONGO_URI;

      try {
        await connectDB();
        fail('Should have thrown an error');
      } catch (error: any) {
        // The MONGO_URI check throws immediately, but retry logic catches and re-throws
        // After all retries, it throws "Database connection failed after multiple retries."
        expect(error.message).toBe('Database connection failed after multiple retries.');
      } finally {
        process.env.MONGO_URI = originalUri;
      }
    });

    it('should retry connection with exponential backoff and eventually succeed', async () => {
      const mongod = await MongoMemoryServer.create();
      const validUri = mongod.getUri();

      let attemptCount = 0;
      const originalConnect = mongoose.connect;

      // Mock to fail first 2 attempts, succeed on 3rd
      const connectSpy = jest.spyOn(mongoose, 'connect').mockImplementation(async (uri: string, options?: any) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Connection failed');
        }
        // Restore and call original on success
        connectSpy.mockRestore();
        return originalConnect.call(mongoose, uri, options);
      });

      process.env.MONGO_URI = validUri;

      await connectDB();

      expect(attemptCount).toBe(3);
      expect(mongoose.connection.readyState).toBe(1);

      await mongoose.disconnect();
      await mongod.stop();
    }, 40000);

    it('should throw error after max retries exceeded', async () => {
      process.env.MONGO_URI = 'mongodb://invalid:27017/test';
      process.env.NODE_ENV = 'test';

      // Mock to always fail
      const connectSpy = jest.spyOn(mongoose, 'connect').mockRejectedValue(new Error('Connection refused'));

      try {
        await connectDB();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Database connection failed after multiple retries.');
      } finally {
        connectSpy.mockRestore();
      }
    }, 40000);
  });

  describe('disconnectDB', () => {
    it('should disconnect successfully', async () => {
      await mongoose.disconnect();
      const mongod = await MongoMemoryServer.create();
      process.env.MONGO_URI = mongod.getUri();

      await connectDB();
      expect(mongoose.connection.readyState).toBe(1);

      await disconnectDB();
      expect(mongoose.connection.readyState).toBe(0);

      await mongod.stop();
    }, 30000);

    it('should handle disconnection errors gracefully', async () => {
      await mongoose.disconnect();
      const mongod = await MongoMemoryServer.create();
      process.env.MONGO_URI = mongod.getUri();

      await connectDB();

      // Mock close to throw error
      const closeSpy = jest.spyOn(mongoose.connection, 'close').mockRejectedValueOnce(new Error('Close failed'));

      // Should not throw, just log error
      await expect(disconnectDB()).resolves.not.toThrow();

      closeSpy.mockRestore();
      await mongoose.disconnect();
      await mongod.stop();
    }, 30000);
  });
});