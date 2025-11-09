import { Router, Request, Response, NextFunction } from "express";
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
import AppError from "../utils/AppError";

const router = Router();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post(
  "/register",
  validateRegister,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    // Check if email was verified via OTP
    const emailVerified = await isEmailVerified(email);
    if (!emailVerified) {
      return next(
        new AppError("Please verify your email with OTP before registering", 403)
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("User already exists", 400));
    }

    const newUser: IUser = new User({
      username,
      email,
      password,
      authProvider: "local",
      verified: true,
    });

    await newUser.save();

    // Delete OTP record after successful registration
    await UserEmailOtpVerification.deleteMany({
      email: email.toLowerCase().trim(),
    });

    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "3h" }
    );

    res.status(201).json({
      message: "User registered successfully. Please login to continue.",
      token,
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
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.authProvider !== "local") {
      return next(new AppError("Invalid credentials", 400));
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError("Invalid credentials", 400));
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "3h" }
    );

    res.status(200).json({
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
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;
    if (!username) {
      return next(new AppError("Username is required", 400));
    }

    const existingUser = await User.findOne({ username });
    res.status(200).json({ available: !existingUser });
  })
);

/**
 * @desc    Check if an email is available
 * @route   POST /api/auth/check-email
 * @access  Public
 */
router.post(
  "/check-email",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    res.status(200).json({ available: !existingUser });
  })
);

/**
 * @desc    Send OTP verification email (before registration)
 * @route   POST /api/auth/send-otp
 * @access  Public
 */
router.post(
  "/send-otp",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    const result = await sendOtpVerificationMail(email);

    if (result.status === "FAILED") {
      return next(new AppError(result.message, 400));
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
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return next(new AppError("Email and OTP are required", 400));
    }

    const result = await verifyOtp(email, otp);

    if (result.status === "FAILED") {
      return next(new AppError(result.message, 400));
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
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    const result = await sendOtpVerificationMail(email);

    if (result.status === "FAILED") {
      return next(new AppError(result.message, 400));
    }

    res.json({
      status: result.status,
      message: result.message,
      data: result.data,
    });
  })
);

export default router;