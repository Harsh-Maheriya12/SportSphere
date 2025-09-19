import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import connectDB from '../../config/db';

// --- Integration Test (mongodb-memory-server) ---
describe('MongoDB Integration Test with in-memory server', () => {
  let mongod: MongoMemoryServer;  // Declare variable to hold the in-memory database instance

  // beforeAll is a hook that runs once before all tests in this suite
  beforeAll(async () => {
    await mongoose.disconnect();  // Ensure any existing mongoose connection is closed before starting
    mongod = await MongoMemoryServer.create();  // Create a new in-memory MongoDB server instance
    process.env.MONGO_URI = mongod.getUri();  // Set the environment variable so that connectDB function uses the in-memory database
    await connectDB();  // Call application's database connection logic
  }, 20000);  // Set a longer timeout (20s) for this hook as starting the server can take time

  // afterAll is a cleanup hook that runs once after all tests in this suite have finished
  afterAll(async () => {
    // Clean up the database by dropping all data
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();  // Close the connection to the in-memory database
    await mongoose.disconnect();  // Stop the in-memory server process to free up system resources
    await mongod.stop();
  });

  // Define an individual test case
  it('should connect to in-memory MongoDB', () => {
    // The assertion: expect the connection's readyState to be 1 (which means connected)
    expect(mongoose.connection.readyState).toBe(1);
  });

  // Define a second test case
  it('should insert and retrieve a test document', async () => {
    // Set up a temporary model for this test
    const TestSchema = new mongoose.Schema({ name: String });
    const TestModel = mongoose.model('Test', TestSchema);

    // Perform database operations
    // Create a new document in the database
    const doc = await TestModel.create({ name: 'Test User' });
    // Try to find the document we just created
    const found = await TestModel.findById(doc._id);

    // Check if the operations were successful
    // Expect that the document was found (is not null)
    expect(found).not.toBeNull();
    // Expect that the found document has the correct name
    expect(found?.name).toBe('Test User');
  });
});