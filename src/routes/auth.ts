import { Router, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { validateRegister } from "../middleware/validation";
import {
  sendOtpVerificationMail,
  verifyOtp,
  isEmailVerified,
} from "../controllers/emailHelper";
import UserEmailOtpVerification from "../models/UserEmailOtpVerification";

// Create a new Express router instance for authentication routes.
const router = Router();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post(
  "/register",
  validateRegister,
  asyncHandler(async (req: Request, res: Response) => {
    // Extract user details from the request body.
    const { username, email, password } = req.body;

    // Check if email was verified via OTP
    const emailVerified = await isEmailVerified(email);
    if (!emailVerified) {
      res.status(403);
      throw new Error("Please verify your email with OTP before registering");
    }

    // Create a new user instance using the User model.
    const newUser: IUser = new User({
      username,
      email,
      password,
      authProvider: "local",
      verified: true, // Email is already verified
    });

    // The `pre('save')` hook on the User model will hash the password before this operation.
    await newUser.save();

    // Delete the OTP record after successful registration
    await UserEmailOtpVerification.deleteMany({
      email: email.toLowerCase().trim(),
    });

    // Send a 201 Created response with the token and curated user data.
    res.status(201).json({
      message: "User registered successfully. Please login to continue.",
      success: true,
      user: {
        username: newUser.username,
        email: newUser.email,
      },
    });
  })
);

/**
 * @desc    Authenticate a user and get a token
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find the user by email and explicitly request the password field, which is hidden by default.
    const user = await User.findOne({ email }).select("+password");
    if (!user || user.authProvider !== "local") {
      // For security, use a generic error message for both non-existent users and wrong providers.
      res.status(400);
      throw new Error("Invalid credentials");
    }

    // Use the custom `comparePassword` method on the user model to securely check the password.
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400);
      throw new Error("Invalid credentials");
    }

    // If credentials are correct, generate a new JWT.
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "3h" }
    );

    // Send the token and user data back to the client.
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    });
  })
);

/**
 * @desc    Check if a username is available
 * @route   POST /api/auth/check-username
 * @access  Public
 */
router.post(
  "/check-username",
  asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;
    if (!username) {
      res.status(400);
      throw new Error("Username is required");
    }

    // Check the database for a user with the given username.
    const existingUser = await User.findOne({ username });

    // Respond with a boolean indicating if the username is available.
    res.json({ available: !existingUser });
  })
);

/**
 * @desc    Check if an email is available
 * @route   POST /api/auth/check-email
 * @access  Public
 */
router.post(
  "/check-email",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    // Check the database for a user with the given email.
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    // Respond with a boolean indicating if the email is available.
    res.json({ available: !existingUser });
  })
);

/**
 * @desc    Send OTP verification email (before registration)
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
router.post(
  "/send-otp",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    // Send OTP verification mail
    const result = await sendOtpVerificationMail(email);

    if (result.status === "FAILED") {
      res.status(400);
      throw new Error(result.message);
    }

    res.json({
      status: result.status,
      message: result.message,
      data: result.data,
    });
  })
);

/**
 * @desc    Verify OTP (before registration)
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
router.post(
  "/verify-otp",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400);
      throw new Error("Email and OTP are required");
    }

    // Verify OTP
    const result = await verifyOtp(email, otp);

    if (result.status === "FAILED") {
      res.status(400);
      throw new Error(result.message);
    }

    res.json({
      status: result.status,
      message: result.message,
      verified: result.verified,
    });
  })
);

/**
 * @desc    Resend OTP verification email
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
router.post(
  "/resend-otp",
  asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    // Send OTP verification mail (this will delete any existing OTP for this email)
    const result = await sendOtpVerificationMail(email);

    if (result.status === "FAILED") {
      res.status(400);
      throw new Error(result.message);
    }

    res.json({
      status: result.status,
      message: result.message,
      data: result.data,
    });
  })
);

export default router;
