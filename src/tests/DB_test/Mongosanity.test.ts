import mongoose from 'mongoose';
import { connectDB } from '../../config/db';

// Check for a Continuous Integration (CI) environment variable.
const isCI = process.env.CI === 'true';

// --- Minimal Sanity Test (real MongoDB connection) ---

// Define a test suite. This test is a basic "sanity check".
// We skip this entire suite if running in a CI environment,
// as a live database might not be available there.
(false ? describe.skip : describe)('MongoDB Sanity Connection Test', () => {

// beforeAll hook that runs once before any of the tests in this suite.
// used here to set up the database connection.
beforeAll(async () => {
    // If a MONGO_URI is not already set in the environment, provide a default
    // one that points to a local test database.
    process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sportsphere_test';

    // Call our application's function to connect to the database.
    await connectDB();
}, 20000);  // Give the setup a longer timeout (20 seconds) as connecting can be slow.

// afterAll runs once after all tests in this suite are finished.
afterAll(async () => {

    // close the database connection to prevent hanging processes.
    await mongoose.connection.close();
    await mongoose.disconnect();
});

// test case.
it('should connect to MongoDB with readyState = 1', () => {
    // An assertion to check the connection status.
    expect(mongoose.connection.readyState).toBe(1);
});
});