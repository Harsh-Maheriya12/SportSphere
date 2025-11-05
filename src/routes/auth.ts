import { Router, Request, Response, NextFunction } from "express";
import asyncHandler from 'express-async-handler';
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { validateRegister } from '../middleware/validation';
import AppError from "../utils/AppError";

const router = Router();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post("/register", validateRegister, asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    // Double-check for existing user (redundant but explicit)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("User already exists", 400));
    }

    const newUser: IUser = new User({
      username,
      email,
      password,
      authProvider: "local",
    });

    await newUser.save();

    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "3h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
}));

/**
 * @desc    Authenticate a user and get a token
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post("/login", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.authProvider !== 'local') {
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
      },
    });
}));

/**
 * @desc    Check if a username is available
 * @route   POST /api/auth/check-username
 * @access  Public
 */
router.post("/check-username", asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { username } = req.body;
    if (!username) {
        return next(new AppError('Username is required', 400));
    }

    const existingUser = await User.findOne({ username });
    res.status(200).json({ available: !existingUser });
}));

export default router;