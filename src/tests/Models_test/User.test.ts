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

    // ===== PASSWORD HASHING TESTS =====

    it('should correctly hash the password before saving a new local user', async () => {
        const plainPassword = 'password123';
        const userData = {
            username: 'hashuser',
            email: 'hash@example.com',
            password: plainPassword,
            authProvider: 'local' as 'local',
            age: 25,
            gender: 'male' as 'male',
            profilePhoto: 'https://example.com/photo.jpg',
        };

        const user = new User(userData);
        await user.save();

        // The password stored should not be the plain text password
        expect(user.password).toBeDefined();
        expect(user.password).not.toBe(plainPassword);

        // A bcrypt hash has a recognizable structure
        expect(user.password).toMatch(/^\$2[abxy]?\$\d{2}\$/);
    });

    it('should not rehash password if it has not been modified', async () => {
        const plainPassword = 'password123';
        const user = new User({
            username: 'norehashuser',
            email: 'norehash@example.com',
            password: plainPassword,
            authProvider: 'local',
            age: 30,
            gender: 'female' as 'female',
            profilePhoto: 'https://example.com/photo2.jpg',
        });
        await user.save();

        const hashedPassword = user.password;

        // Update a different field (not password)
        user.username = 'updateduser';
        await user.save();

        // Password should remain the same hash
        expect(user.password).toBe(hashedPassword);
    });

    it('should not hash a password if the authProvider is not local', async () => {
        const userData = {
            username: 'googleuser',
            email: 'google@example.com',
            authProvider: 'google' as 'google',
            age: 28,
            gender: 'other' as 'other',
            profilePhoto: 'https://example.com/google-photo.jpg',
            providerId: 'google-123456',
        };

        const user = new User(userData);
        await user.save();

        // Password field should be undefined for OAuth users
        expect(user.password).toBeUndefined();
    });

    // ===== PASSWORD COMPARISON TESTS =====

    it('should return true for a correct password and false for an incorrect one', async () => {
        const plainPassword = 'password123';
        const user = new User({
            username: 'compareuser',
            email: 'compare@example.com',
            password: plainPassword,
            authProvider: 'local',
            age: 26,
            gender: 'male' as 'male',
            profilePhoto: 'https://example.com/compare.jpg',
        });
        await user.save();

        // Should return true for the correct password
        const isMatch = await user.comparePassword(plainPassword);
        expect(isMatch).toBe(true);

        // Should return false for an incorrect password
        const isNotMatch = await user.comparePassword('wrongpassword');
        expect(isNotMatch).toBe(false);
    });

    it('should return false when comparing password for OAuth user without password', async () => {
        const user = new User({
            username: 'oauthuser',
            email: 'oauth@example.com',
            authProvider: 'google',
            age: 24,
            gender: 'female' as 'female',
            profilePhoto: 'https://example.com/oauth.jpg',
            providerId: 'google-789',
        });
        await user.save();

        // Should return false since OAuth users don't have passwords
        const result = await user.comparePassword('anypassword');
        expect(result).toBe(false);
    });

    // ===== VALIDATION TESTS =====

    it('should validate age range (min: 13, max: 120)', async () => {
        const userData = {
            username: 'younguser',
            email: 'young@example.com',
            password: 'password123',
            authProvider: 'local' as 'local',
            age: 10, // Too young
            gender: 'male' as 'male',
            profilePhoto: 'https://example.com/young.jpg',
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();

        // Test max age
        userData.age = 150; // Too old
        userData.email = 'old@example.com';
        const oldUser = new User(userData);
        await expect(oldUser.save()).rejects.toThrow();

        // Valid age should work
        userData.age = 25;
        userData.email = 'valid@example.com';
        const validUser = new User(userData);
        await expect(validUser.save()).resolves.toBeDefined();
    });

    it('should validate gender enum', async () => {
        const userData = {
            username: 'gendertest',
            email: 'gender@example.com',
            password: 'password123',
            authProvider: 'local' as 'local',
            age: 25,
            gender: 'invalid' as any, // Invalid gender
            profilePhoto: 'https://example.com/gender.jpg',
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();
    });

    it('should validate role enum', async () => {
        const userData = {
            username: 'roletest',
            email: 'role@example.com',
            password: 'password123',
            authProvider: 'local' as 'local',
            age: 25,
            gender: 'male' as 'male',
            profilePhoto: 'https://example.com/role.jpg',
            role: 'invalid-role' as any,
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();
    });

    it('should require proof for coach role', async () => {
        const userData: any = {
            username: 'coachuser',
            email: 'coach@example.com',
            password: 'password123',
            authProvider: 'local' as 'local',
            age: 35,
            gender: 'male' as 'male',
            profilePhoto: 'https://example.com/coach.jpg',
            role: 'coach' as 'coach',
            // Missing proof field
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();

        // Should work with proof
        userData.proof = 'https://example.com/coach-cert.pdf';
        userData.email = 'coach2@example.com';
        const validCoach = new User(userData);
        await expect(validCoach.save()).resolves.toBeDefined();
    });

    it('should require proof for venue-owner role', async () => {
        const userData: any = {
            username: 'venueowner',
            email: 'owner@example.com',
            password: 'password123',
            authProvider: 'local' as 'local',
            age: 40,
            gender: 'female' as 'female',
            profilePhoto: 'https://example.com/owner.jpg',
            role: 'venue-owner' as 'venue-owner',
            // Missing proof field
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();

        // Should work with proof
        userData.proof = 'https://example.com/venue-license.pdf';
        userData.email = 'owner2@example.com';
        const validOwner = new User(userData);
        await expect(validOwner.save()).resolves.toBeDefined();
    });

    // ===== OAUTH TESTS =====

    it('should allow Google users without password and store providerId', async () => {
        const userData = {
            username: 'googleuser2',
            email: 'google2@example.com',
            authProvider: 'google' as 'google',
            providerId: 'google-unique-id-123',
            age: 29,
            gender: 'male' as 'male',
            profilePhoto: 'https://lh3.googleusercontent.com/photo.jpg',
        };

        const user = new User(userData);
        await user.save();

        expect(user.authProvider).toBe('google');
        expect(user.providerId).toBe('google-unique-id-123');
        expect(user.password).toBeUndefined();
        expect(user.verified).toBe(false); // Default value
    });

    // ===== DEFAULT VALUES TESTS =====

    it('should set default values for role and verified', async () => {
        const userData = {
            username: 'defaultuser',
            email: 'default@example.com',
            password: 'password123',
            authProvider: 'local' as 'local',
            age: 22,
            gender: 'female' as 'female',
            profilePhoto: 'https://example.com/default.jpg',
            // Not specifying role or verified
        };

        const user = new User(userData);
        await user.save();

        expect(user.role).toBe('user'); // Default role
        expect(user.verified).toBe(false); // Default verified
    });

    it('should require password for local users', async () => {
        const userData = {
            username: 'localuser',
            email: 'local@example.com',
            authProvider: 'local' as 'local',
            age: 27,
            gender: 'male' as 'male',
            profilePhoto: 'https://example.com/local.jpg',
            // Missing password
        };

        const user = new User(userData);
        await expect(user.save()).rejects.toThrow();
    });
});