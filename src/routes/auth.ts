import { Router, Request, Response } from "express";
import asyncHandler from 'express-async-handler';
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { validateRegister } from '../middleware/validation';

// Create a new Express router instance for authentication routes.
const router = Router();

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
router.post("/register", validateRegister, asyncHandler(async (req: Request, res: Response) => {
    // The request body has already been validated by the `validateRegister` middleware.
    const { username, email, password } = req.body;

    // Create a new user instance using the User model.
    const newUser:IUser = new User({
      username,
      email,
      password,
      authProvider: "local",
    });

    // The `pre('save')` hook on the User model will hash the password before this operation.
    await newUser.save();

    // Generate a JSON Web Token for the newly created user.
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "3h" }
    );

    // Send a 201 Created response with the token and curated user data.
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
router.post("/login", asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find the user by email and explicitly request the password field, which is hidden by default.
    const user = await User.findOne({ email }).select("+password");
    if (!user || user.authProvider !== 'local') {
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
      },
    });
}));

/**
 * @desc    Check if a username is available
 * @route   POST /api/auth/check-username
 * @access  Public
 */
router.post("/check-username", asyncHandler(async (req: Request, res: Response) => {
    const { username } = req.body;
    if (!username) {
        res.status(400);
        throw new Error('Username is required');
    }
    
    // Check the database for a user with the given username.
    const existingUser = await User.findOne({ username });

    // Respond with a boolean indicating if the username is available.
    res.json({ available: !existingUser });
}));

export default router;