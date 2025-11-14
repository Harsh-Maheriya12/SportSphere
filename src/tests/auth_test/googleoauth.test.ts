jest.mock("axios", () => ({
  post: jest.fn().mockRejectedValue(new Error("OAuth exchange failed")),
  get: jest.fn().mockRejectedValue(new Error("Profile fetch failed")),
}));

import request from "supertest";
import app from "../../app";
import mongoose from "mongoose";

/**
 * NOTE:
 * These tests only validate that the Google OAuth endpoints respond correctly.
 * They DO NOT hit Google servers.
 * Fully mocking the Google OAuth flow requires integration testing,
 * which the backend does not perform directly.
 */

describe("Google OAuth Flow", () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI as string);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test("GET /api/auth/google should redirect to Google OAuth", async () => {
    const res = await request(app).get("/api/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
  });

  test("GET /api/auth/google/callback without code should return error", async () => {
    const res = await request(app).get("/api/auth/google/callback");

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
  });

  test("GET /api/auth/google/callback with invalid code should fail gracefully", async () => {
    const res = await request(app)
      .get("/api/auth/google/callback")
      .query({ code: "INVALID_CODE" });

    expect([400, 500]).toContain(res.status);
    expect(res.body.status).toBe("error");
  });
});
