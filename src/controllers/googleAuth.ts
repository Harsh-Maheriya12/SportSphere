import axios from "axios";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import User from "../models/User";
import AppError from "../utils/AppError";

/**
 * Step 1: Redirect user to Google OAuth 2.0 consent screen
 */
export const redirectToGoogle = asyncHandler(
  async (req: Request, res: Response) => {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";

    const options = {
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "openid",
        "email",
        "profile",
      ].join(" "),
    };

    const params = new URLSearchParams(options);

    res.redirect(`${rootUrl}?${params.toString()}`);
  }
);

/**
 * Step 2: Handle Google callback and authenticate user
 */
export const googleCallback = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const code = req.query.code as string;

    if (!code) {
      return next(new AppError("Authorization code missing", 400));
    }

    try {
      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
          grant_type: "authorization_code",
        }
      );

      const { access_token, id_token } = tokenResponse.data;

      // 2. Get user profile using access token
      const profileResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v3/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      const googleUser = profileResponse.data;

      if (!googleUser.email) {
        return next(new AppError("Google account has no email", 400));
      }

      // 3. Find or create user in DB
      let user = await User.findOne({ email: googleUser.email });

      if (!user) {
        user = new User({
          username: googleUser.name,
          email: googleUser.email.toLowerCase().trim(),
          authProvider: "google",
          providerId: googleUser.sub,
          role: "user",
          verified: true
        });

        await user.save();
      }

      // 4. Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "3h" }
      );

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        // ensure no double slashes
        const base = frontendUrl.replace(/\/+$/, '');

        // build absolute redirect url and encode token
        const redirectUrl = `${base}/oauth-success?token=${encodeURIComponent(token)}`;

        res.redirect(redirectUrl);
    } catch (error: any) {
      console.error("Google OAuth Error:", error.response?.data || error.message);
      return next(
        new AppError(
          "Failed to authenticate with Google. Please try again.",
          500
        )
      );
    }
  }
);