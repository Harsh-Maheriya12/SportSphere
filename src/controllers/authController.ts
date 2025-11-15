import { Request, Response } from "express";
import jwt from "jsonwebtoken";
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
export const register = async (req: Request, res: Response) => {
  const { username, email, password, role, age, gender } = req.body;
  const files = req.files as Express.Multer.File[];

  try {
    // Verify email OTP was completed
    const emailVerified = await isEmailVerified(email);
    if (!emailVerified) {
      res.json({ 
        success: false, 
        message: "Please verify your email with OTP before registering" 
      });
      return;
    }

    if (!files || files.length === 0) {
      res.json({ 
        success: false, 
        message: "Profile photo is required" 
      });
      return;
    }

    const profilePhoto = files.find((file) => file.fieldname === "profilePhoto");
    const proof = files.find((file) => file.fieldname === "proof");

    if (!profilePhoto) {
      res.json({ 
        success: false, 
        message: "Profile photo is required" 
      });
      return;
    }

    // Coach and venue-owner must provide proof document
    if ((role === "coach" || role === "venue-owner") && !proof) {
      res.json({ 
        success: false, 
        message: "Proof document is required for coach and venue-owner roles" 
      });
      return;
    }

    // Upload files to Cloudinary
    const profilePhotoUrl = await uploadToCloudinary(profilePhoto.path, "profile-photos");
    let proofUrl: string | undefined;
    if (proof) {
      proofUrl = await uploadToCloudinary(proof.path, "proof-documents");
    }

    const newUser: IUser = new User({
      username,
      email,
      password,
      role,
      age: parseInt(age),
      gender,
      profilePhoto: profilePhotoUrl,
      proof: proofUrl,
      authProvider: "local",
      verified: true,
    });

    await newUser.save();

    // Delete OTP record after successful registration
    await UserEmailOtpVerification.deleteMany({
      email: email.toLowerCase().trim(),
    });

    res.json({
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
};

// Authenticate user and return JWT token
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.authProvider !== "local") {
      res.json({ 
        success: false, 
        message: "Invalid credentials" 
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.json({ 
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
  } catch (error) {
    throw error;
  }
};

// Check if username is available for registration
export const checkUsername = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};

// Check if email is available for registration
export const checkEmail = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};

// Send OTP for email verification before registration
export const sendOtp = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};

// Verify OTP for email verification
export const verifyOtpController = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};

// Resend OTP if expired or not received
export const resendOtp = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};

// Send OTP for password reset
export const sendPasswordResetOtpController = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};

// Verify OTP for password reset
export const verifyPasswordResetOtpController = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.json({ 
        success: false, 
        message: "Email and OTP are required" ,
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
  } catch (error) {
    throw error;
  }
};

// Reset password with verified OTP
export const resetPassword = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    throw error;
  }
};
