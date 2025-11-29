import request from "supertest";
import app from "../../app";
import mongoose from "mongoose";
import axios from "axios";
import User from "../../models/User";
import UserEmailOtpVerification from "../../models/UserEmailOtpVerification";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * NOTE:
 * These tests validate that the Google OAuth endpoints respond correctly.
 * They DO NOT hit Google servers - axios is mocked.
 */

describe("Google OAuth Flow", () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI as string);
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
        await new Promise(resolve => setTimeout(resolve, 500));
    });

    beforeEach(async () => {
        // Clear database before each test
        await User.deleteMany({});
        await UserEmailOtpVerification.deleteMany({});
        jest.clearAllMocks();
        process.env.FRONTEND_URL = "http://test-frontend.com";
    });

    afterEach(() => {
        delete process.env.FRONTEND_URL;
    });

    describe("GET /api/auth/google", () => {
        test("should redirect to Google OAuth", async () => {
            const res = await request(app).get("/api/auth/google");

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
        });
    });

    describe("GET /api/auth/google/callback", () => {
        test("without code should return error", async () => {
            const res = await request(app).get("/api/auth/google/callback");

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("http://test-frontend.com/login?error=Login+Failed");
        });

        test("with invalid code should fail gracefully", async () => {
            mockedAxios.post.mockRejectedValue(new Error("OAuth exchange failed"));

            const res = await request(app)
                .get("/api/auth/google/callback")
                .query({ code: "INVALID_CODE" });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("http://test-frontend.com/login?error=Google+Auth+Failed");
        });

        test("with valid code for existing user should login and redirect with token", async () => {
            // Create existing user
            const existingUser = await User.create({
                username: "existinguser",
                email: "existing@gmail.com",
                password: "password123",
                authProvider: "google",
                age: 25,
                gender: "male",
                profilePhoto: "http://example.com/photo.jpg",
                role: "player"
            });

            // Mock successful Google OAuth responses
            mockedAxios.post.mockResolvedValue({
                data: {
                    access_token: "mock_access_token",
                    id_token: "mock_id_token"
                }
            });

            mockedAxios.get.mockResolvedValue({
                data: {
                    email: "existing@gmail.com",
                    name: "Existing User",
                    picture: "http://google.com/photo.jpg",
                    sub: "google_user_id_123"
                }
            });

            const res = await request(app)
                .get("/api/auth/google/callback")
                .query({ code: "VALID_CODE" });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("http://test-frontend.com/oauth-success?token=");
            expect(res.headers.location).not.toContain("email=");
        });

        test("with valid code for new user should create verification and redirect to registration", async () => {
            // Mock successful Google OAuth responses
            mockedAxios.post.mockResolvedValue({
                data: {
                    access_token: "mock_access_token",
                    id_token: "mock_id_token"
                }
            });

            mockedAxios.get.mockResolvedValue({
                data: {
                    email: "newuser@gmail.com",
                    name: "New User",
                    picture: "http://google.com/photo.jpg",
                    sub: "google_user_id_456"
                }
            });

            const res = await request(app)
                .get("/api/auth/google/callback")
                .query({ code: "VALID_CODE" });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("http://test-frontend.com/oauth-success?email=");
            expect(res.headers.location).toContain("name=New%20User");
            expect(res.headers.location).toContain("provider=google");

            // Verify OTP verification record was created
            const otpRecord = await UserEmailOtpVerification.findOne({ email: "newuser@gmail.com" });
            expect(otpRecord).toBeTruthy();
            expect(otpRecord?.otp).toBe("GOOGLE_VERIFIED");
        });

        test("when Google returns no email should redirect with error", async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    access_token: "mock_access_token",
                    id_token: "mock_id_token"
                }
            });

            mockedAxios.get.mockResolvedValue({
                data: {
                    name: "User Without Email",
                    picture: "http://google.com/photo.jpg",
                    sub: "google_user_id_789"
                    // email is missing
                }
            });

            const res = await request(app)
                .get("/api/auth/google/callback")
                .query({ code: "VALID_CODE" });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("http://test-frontend.com/login?error=Google+account+has+no+email");
        });

        test("new user without name should use email prefix", async () => {
            mockedAxios.post.mockResolvedValue({
                data: {
                    access_token: "mock_access_token",
                    id_token: "mock_id_token"
                }
            });

            mockedAxios.get.mockResolvedValue({
                data: {
                    email: "noname@gmail.com",
                    sub: "google_user_id_999"
                    // name and picture are missing
                }
            });

            const res = await request(app)
                .get("/api/auth/google/callback")
                .query({ code: "VALID_CODE" });

            expect(res.status).toBe(302);
            expect(res.headers.location).toContain("name=noname");
            expect(res.headers.location).toContain("picture=");
        });
    });
});
