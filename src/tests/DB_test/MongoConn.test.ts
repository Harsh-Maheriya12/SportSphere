import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB } from '../../config/db';
import dotenv from "dotenv";

dotenv.config();

describe('MongoDB Integration Test with in-memory server', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    await mongoose.disconnect();
    mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri();
    await connectDB();
  }, 20000);

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoose.disconnect();
    await mongod.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
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