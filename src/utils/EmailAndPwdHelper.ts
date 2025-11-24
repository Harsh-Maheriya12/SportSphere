import bcrypt from "bcryptjs";
import UserEmailOtpVerification from "../models/UserEmailOtpVerification";
import User from "../models/User";
import {sendEmail} from "../config/transporter";

// Send OTP verification email (before registration)

export const sendOtpVerificationMail = async (
  email: string
): Promise<{ success: boolean; message: string; data?: { email: string } }> => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return {
        success: false,
        message: "Email already registered. Please login.",
      };
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Hash the OTP
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otp, saltRounds);

    // Delete any existing OTP records for this email
    await UserEmailOtpVerification.deleteMany({ email });

    // Create a new OTP verification record
    const newOtpVerificationRecord = new UserEmailOtpVerification({
      email: email.toLowerCase().trim(),
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000, // Add 10 minutes
    });

    // Save and send the email
    await newOtpVerificationRecord.save();
    await sendEmail(email, otp.toString());

    return {
      success: true,
      message: "Verification OTP email sent successfully",
      data: { email }, 
    };
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    return {
      success: false,
      message: error.message || "Failed to send OTP email",
    };
  }
};

// Verify Otp (Before Final registration)
export const verifyOtp = async (
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; verified: boolean }> => {
  try {
    // If otp or email not present
    if (!otp || !email) {
      return {
        success: false,
        message: "OTP and email are required",
        verified: false,
      };
    }

    // Find the OTP record
    const otpRecords = await UserEmailOtpVerification.find({
      email: email.toLowerCase().trim(),
    });

    if (otpRecords.length === 0) {
      return {
        success: false,
        message: "No OTP found for this email. Please request a new one.",
        verified: false,
      };
    }

    const { expiresAt, otp: hashedOtp } = otpRecords[0];

    const currentTime = new Date();

    if (expiresAt < currentTime) {
      // Time expired, delete the record
      await UserEmailOtpVerification.deleteMany({
        email: email.toLowerCase().trim(),
      });
      return {
        success: false,
        message: "Code has expired. Please request again.",
        verified: false,
      };
    }

    const isValidOtp = await bcrypt.compare(otp, hashedOtp);

    if (!isValidOtp) {
      return {
        success: false,
        message: "Invalid OTP. Please try again.",
        verified: false,
      };
    }

    // Add 5 min to complete registration
    await UserEmailOtpVerification.updateOne(
      { email: email.toLowerCase().trim() },
      { expiresAt: Date.now() + 300000 } // 5 more minutes to complete registration
    );

    return {
      success: true,
      message: "OTP verified successfully.",
      verified: true,
    };
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return {
      success: false,
      message: error.message || "Failed to verify OTP",
      verified: false,
    };
  }
};

// check function for email verified or not
export const isEmailVerified = async (email: string): Promise<boolean> => {
  try {
    const otpRecord = await UserEmailOtpVerification.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!otpRecord) {
      return false;
    }

    const currentTime = new Date();
    if (otpRecord.expiresAt < currentTime) {
      // Expired, delete it
      await UserEmailOtpVerification.deleteMany({
        email: email.toLowerCase().trim(),
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking email verification:", error);
    return false;
  }
};

// Funcion for reset password using 4-digit OTP 
export const sendPasswordResetOtp = async (
  email: string
): Promise<{ success: boolean; message: string; data?: { email: string } }> => {
  try {
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (!existingUser) {
      return {
        success: false,
        message: "No account found with this email address.",
      };
    }

    // Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Hash OTP
    const saltRounds = 10;
    const hashedOtp = await bcrypt.hash(otp, saltRounds);

    await UserEmailOtpVerification.deleteMany({
      email: email.toLowerCase().trim(),
    });

    const newOtpVerificationRecord = new UserEmailOtpVerification({
      email: email.toLowerCase().trim(),
      otp: hashedOtp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
    });

    // save and send mail
    await newOtpVerificationRecord.save();
    await sendEmail(email, otp.toString());

    return {
      success: true,
      message: "Password reset OTP sent successfully to your email",
      data: { email },
    };
  } catch (error: any) {
    console.error("Error sending password reset OTP:", error);
    return {
      success: false,
      message: error.message || "Failed to send password reset OTP",
    };
  }
};
