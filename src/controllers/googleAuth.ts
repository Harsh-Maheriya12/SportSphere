import axios from "axios";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import User from "../models/User";
import AppError from "../utils/AppError";
import UserEmailOtpVerification from "../models/UserEmailOtpVerification";
import logger from "../config/logger";

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
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const base = frontendUrl.replace(/\/+$/, '');

    if (!code) {
      return res.redirect(`${base}/login?error=Login+Failed!+Please+Retry!`);
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

      logger.info({
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        sub: googleUser.sub
      }, 'Google user data received');

      if (!googleUser.email) {
        return res.redirect(`${base}/login?error=Google+account+has+no+email`);
      }

      // 3. Check if user already exists
      const existingUser = await User.findOne({ email: googleUser.email.toLowerCase().trim() });

      if (existingUser) {
        logger.info({ email: existingUser.email }, 'Existing user found, logging in');
        // User exists - perform normal login
        const token = jwt.sign(
          { userId: existingUser._id, role: existingUser.role },
          process.env.JWT_SECRET!,
          { expiresIn: "3h" }
        );

        const redirectUrl = `${base}/oauth-success?token=${encodeURIComponent(token)}`;

        logger.info({ redirectUrl }, 'Redirecting existing user');
        return res.redirect(redirectUrl);
      }

      logger.info('New user detected, creating verification record');
      // 4. New user - Mark email as verified and redirect to registration

      // Delete any existing OTP records for this email
      await UserEmailOtpVerification.deleteMany({
        email: googleUser.email.toLowerCase().trim()
      });

      // Create a verified record (no actual OTP needed)
      const verifiedRecord = new UserEmailOtpVerification({
        email: googleUser.email.toLowerCase().trim(),
        otp: "GOOGLE_VERIFIED", // Special marker for Google OAuth
        createdAt: Date.now(),
        expiresAt: Date.now() + 3600000, // 1 hour to complete registration
      });

      await verifiedRecord.save();

      // Redirect to registration with Google data
      // Ensure we have all required data
      const userName = googleUser.name || googleUser.email.split('@')[0];
      const userPicture = googleUser.picture || '';

      const redirectUrl = `${base}/oauth-success?email=${encodeURIComponent(googleUser.email)}&name=${encodeURIComponent(userName)}&picture=${encodeURIComponent(userPicture)}&provider=google`;

      logger.info({ redirectUrl }, 'Redirecting new Google user');
      res.redirect(redirectUrl);
    } catch (error: any) {
      logger.error({ error: error.response?.data || error.message }, 'Google OAuth Error');
      return res.redirect(`${base}/login?error=Google+Auth+Failed`);
    }
  }
);