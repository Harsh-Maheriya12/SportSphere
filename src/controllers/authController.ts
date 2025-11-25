import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User, { IUser } from "../models/User";
import UserEmailOtpVerification from "../models/UserEmailOtpVerification";
import { uploadToCloudinary } from "../utils/cloudinaryUploader";
import { deleteUploadedFiles } from "../utils/FileHelper";
import {
  sendOtpVerificationMail,
  verifyOtp,
  isEmailVerified,
  sendPasswordResetOtp,
} from "../utils/EmailAndPwdHelper";

// Register a new user
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, role, age, gender, authProvider = "local" } = req.body;
  const files = req.files as Express.Multer.File[];

  try {
    // Verify email OTP was completed (or Google verified)
    const emailVerified = await isEmailVerified(email);
    if (!emailVerified) {
      res.status(400).json({
        success: false,
        message: "Please verify your email with OTP before registering"
      });
      return;
    }

    // For Google OAuth, profile photo is optional (can use Google picture)
    // For local registration, profile photo is required
    const isGoogleAuth = authProvider === "google";

    if (!isGoogleAuth && (!files || files.length === 0)) {
      res.status(400).json({
        success: false,
        message: "Profile photo is required"
      });
      return;
    }

    const profilePhoto = files?.find((file) => file.fieldname === "profilePhoto");
    const proof = files?.find((file) => file.fieldname === "proof");

    // For local auth, profile photo is mandatory
    if (!isGoogleAuth && !profilePhoto) {
      res.status(400).json({
        success: false,
        message: "Profile photo is required"
      });
      return;
    }

    // Coach and venue-owner must provide proof document
    if ((role === "coach" || role === "venue-owner") && !proof) {
      res.status(400).json({
        success: false,
        message: "Proof document is required for coach and venue-owner roles"
      });
      return;
    }

    // Upload files to Cloudinary (if provided)
    let profilePhotoUrl: string = "";

    if (profilePhoto) {
      profilePhotoUrl = await uploadToCloudinary(profilePhoto.path, "profile-photos");
    } else if (isGoogleAuth) {
      // For Google OAuth without custom photo, use a default or fetch from Google
      // We'll use a default placeholder - the frontend can fetch Google picture separately
      profilePhotoUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(username) + "&size=200&background=ff8c00&color=fff";
    }

    let proofUrl: string | undefined;
    if (proof) {
      proofUrl = await uploadToCloudinary(proof.path, "proof-documents");
    }

    // For Google OAuth, password is optional
    const userData: any = {
      username,
      email,
      role,
      age: parseInt(age),
      gender,
      profilePhoto: profilePhotoUrl,
      proof: proofUrl,
      authProvider: isGoogleAuth ? "google" : "local",
      verified: true,
    };

    // Only add password for local registration
    if (!isGoogleAuth && password) {
      userData.password = password;
    }

    const newUser: IUser = new User(userData);

    await newUser.save();

    // Delete OTP record after successful registration
    await UserEmailOtpVerification.deleteMany({
      email: email.toLowerCase().trim(),
    });

    // For Google OAuth users, auto-login by generating JWT token
    if (isGoogleAuth) {
      const token = jwt.sign(
        { userId: newUser._id, role: newUser.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "3h" }
      );

      res.status(201).json({
        success: true,
        message: "Registration successful!",
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          verified: newUser.verified,
        },
      });
      return;
    }

    // For local registration, redirect to login
    res.status(201).json({
      success: true,
      message: "User registered successfully. Please login to continue.",
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    // delete uploaded files on error
    if (files && files.length > 0) {
      deleteUploadedFiles(files);
    }
    throw error;
  }
});

// Authenticate user and return JWT token
export const login = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.authProvider !== "local") {
      res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
      return;
    }

    // Generate JWT token (3 hour expiry)
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "3h" }
    );

    res.json({
      success: true,
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
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred during login. Please try again.",
    });
  }
});

// Check if username is available for registration
export const checkUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.body;
  if (!username) {
    res.json({
      success: false,
      message: "Username is required"
    });
    return;
  }

  const existingUser = await User.findOne({ username });
  res.json({
    success: true,
    available: !existingUser
  });
});

// Check if email is available for registration
export const checkEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.json({
      success: false,
      message: "Email is required"
    });
    return;
  }

  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
  });

  res.json({
    success: true,
    available: !existingUser
  });
});

// Send OTP for email verification before registration
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.json({
      success: false,
      message: "Email is required"
    });
    return;
  }

  const result = await sendOtpVerificationMail(email);

  if (!result.success) {
    res.json({
      success: false,
      message: result.message
    });    return;
  }

  res.json({
    success: true,
    message: result.message,
    data: result.data,
  });
});

// Verify OTP for email verification
export const verifyOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.json({
      success: false,
      message: "Email and OTP are required"
    });
    return;
  }

  const result = await verifyOtp(email, otp);

  if (!result.success) {
    res.json({
      success: false,
      message: result.message
    });
    return;
  }

  res.json({
    success: true,
    message: result.message,
    verified: result.verified,
  });
});

// Resend OTP if expired or not received
export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.json({
      success: false,
      message: "Email is required"
    });
    return;
  }

  const result = await sendOtpVerificationMail(email);

  if (!result.success) {
    res.json({
      success: false,
      message: result.message
    });
    return;
  }

  res.json({
    success: true,
    message: result.message,
    data: result.data,
  });
});

// Send OTP for password reset
export const sendPasswordResetOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    res.json({
      success: false,
      message: "Email is required"
    });
    return;
  }

  const result = await sendPasswordResetOtp(email);

  if (!result.success) {
    res.json({
      success: false,
      message: result.message
    });
    return;
  }

  res.json({
    success: true,
    message: result.message,
  });
});

// Verify OTP for password reset
export const verifyPasswordResetOtpController = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.json({
      success: false,
      message: "Email and OTP are required",
    });
    return;
  }

  const result = await verifyOtp(email, otp);

  if (!result.success) {
    res.json({ success: false, message: result.message });
    return;
  }

  res.json({
    success: true,
    message: result.message,
    verified: result.verified,
  });
});

// Reset password with verified OTP
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.json({
      success: false,
      message: "Email, OTP, and new password are required"
    });
    return;
  }

  // Verify OTP for security
  const otpVerification = await verifyOtp(email, otp);
  if (!otpVerification.verified) {
    res.json({
      success: false,
      message: "Invalid or expired OTP"
    });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user) {
    res.json({
      success: false,
      message: "User not found"
    });
    return;
  }

  user.password = newPassword;
  await user.save();

  // delete otp successful password reset
  await UserEmailOtpVerification.deleteMany({
    email: email.toLowerCase().trim(),
  });

  res.json({
    success: true,
    message: "Password reset successful",
  });
});