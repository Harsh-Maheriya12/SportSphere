import mongoose from 'mongoose';
import { connectDB } from '../../config/db';

const isCI = process.env.CI === 'true';

(false ? describe.skip : describe)('MongoDB Sanity Connection Test', () => {

beforeAll(async () => {
    process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sportsphere_test';
    await connectDB();
}, 20000);

afterAll(async () => {
    await mongoose.connection.close();
    await mongoose.disconnect();
});

it('should connect to MongoDB with readyState = 1', () => {
    expect(mongoose.connection.readyState).toBe(1);
});
});