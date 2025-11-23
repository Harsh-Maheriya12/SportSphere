import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB, disconnectDB } from '../../config/db';
import User from '../../models/User';

describe('User Model Unit Tests', () => {
    let mongod: MongoMemoryServer;

    // Start an in-memory database before all tests.
    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        process.env.MONGO_URI = mongod.getUri();
        await connectDB();
    });

    // Disconnect and stop the database after all tests.
    afterAll(async () => {
        await disconnectDB();
        await mongod.stop();
    });

    // Clear the users collection before each individual test.
    beforeEach(async () => {
        await User.deleteMany({});
    });

    // Password Hashing via the pre('save') hook
    it('should correctly hash the password before saving a new local user', async () => {
        const plainPassword = 'password123';
        const userData = {
            username: 'hashuser',
            email: 'hash@example.com',
            password: plainPassword,
            authProvider: 'local' as 'local',
        };

        const user = new User(userData);
        await user.save();

        // ASSERTION 1: The password stored in the database should not be the plain text password.
        expect(user.password).toBeDefined();
        expect(user.password).not.toBe(plainPassword);

        // ASSERTION 2: A bcrypt hash has a recognizable structure.
        expect(user.password).toMatch(/^\$2[abxy]?\$\d{2}\$/);
    });

    // TEST CASE 2: Password Comparison via the `comparePassword` instance method
    it('should return true for a correct password and false for an incorrect one', async () => {
        const plainPassword = 'password123';
        const user = new User({
            username: 'compareuser',
            email: 'compare@example.com',
            password: plainPassword,
            authProvider: 'local',
        });
        await user.save();

        // The method should return true for the correct password.
        const isMatch = await user.comparePassword(plainPassword);
        expect(isMatch).toBe(true);

        // The method should return false for an incorrect password.
        const isNotMatch = await user.comparePassword('wrongpassword');
        expect(isNotMatch).toBe(false);
    });

    // Password should not be hashed for non-local providers
    it('should not hash a password if the authProvider is not local', async () => {
        const userData = {
            username: 'googleuser',
            email: 'google@example.com',
            authProvider: 'google' as 'google',
            // No password is provided for a Google user
        };

        const user = new User(userData);
        await user.save();

        // ASSERTION: The password field should be undefined after saving.
        expect(user.password).toBeUndefined();
    });
});