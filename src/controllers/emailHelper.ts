import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import UserEmailOtpVerification from "../models/UserEmailOtpVerification";
import User from "../models/User";
import transporter from "../config/transporter";

// Send OTP verification email (before registration)

export const sendOtpVerificationMail = async (
  email: string
): Promise<{ status: string; message: string; data?: { email: string } }> => {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        status: "FAILED",
        message: "Email already registered. Please login.",
      };
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "OTP Verification for SportSphere Registration",
      html: 
      `
        <div style="
        font-family: 'Segoe UI', Roboto, Arial, sans-serif;
        max-width: 600px;
        margin: 0 auto;
        background-color: #121212;
        border-radius: 12px;
        padding: 40px 32px;
        color: #f1f1f1;
        line-height: 1.6;
        border: 1px solid #2c2c2c;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 28px;">
            <h2 style="
              color: #ff8c00;
              font-size: 26px;
              font-weight: 700;
              margin: 0 0 10px;
            ">
              Email Verification
            </h2>
            <p style="margin: 0; color: #cccccc; font-size: 15px;">
              Welcome to <strong>SportSphere</strong>!
            </p>
          </div>

          <!-- Message -->
          <p style="font-size: 15px; color: #d1d1d1; margin-bottom: 20px;">
            Thank you for registering with SportSphere.  
            To complete your sign-up, please use the OTP code below to verify your email address:
          </p>

        <div style="
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          text-align: center;
          margin: auto;
          border-radius: 8px;
          border: 1px solid #ff8c00;
          box-shadow: 0 0 10px rgba(255, 140, 0, 0.2);
          width: 180px;
          height: 20px;
        ">
          <h1 style="
            color: #ff8c00;
            letter-spacing: 6px;
            font-size: 28px;
            font-weight: bold;
            margin: auto;
            padding-bottom:50px;
          ">
            ${otp}
          </h1>
        </div>

          <!-- Expiry Info -->
          <p style="color: #aaaaaa; font-size: 14px; text-align: center;">
            This code will expire in <strong style="color:#ff8c00;">10 minutes</strong>.
          </p>

          <!-- Footer -->
          <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 40px;">
            If you didn’t request this verification, please ignore this email or contact our support team.
          </p>

          <hr style="border: none; border-top: 1px solid #333; margin: 28px 0;">

        <p style="color: #666666; font-size: 12px; text-align: center; margin: 0;">
          © ${new Date().getFullYear()} <strong style="color: #ff8c00;">SportSphere</strong>. All rights reserved.
        </p>
      </div>`,
    };

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

    // Save the record
    await newOtpVerificationRecord.save();

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      status: "PENDING",
      message: "Verification OTP email sent successfully",
      data: { email },
    };
  } catch (error: any) {
    console.error("Error sending OTP email:", error);
    return {
      status: "FAILED",
      message: error.message || "Failed to send OTP email",
    };
  }
};

// Verify Otp (Before Final registration)
export const verifyOtp = async (
  email: string,
  otp: string
): Promise<{ status: string; message: string; verified: boolean }> => {
  try {
    // If otp or email not present
    if (!otp || !email) {
      return {
        status: "FAILED",
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
        status: "FAILED",
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
        status: "FAILED",
        message: "Code has expired. Please request again.",
        verified: false,
      };
    }

    // Verify OTP
    const isValidOtp = await bcrypt.compare(otp, hashedOtp);

    if (!isValidOtp) {
      return {
        status: "FAILED",
        message: "Invalid OTP. Please try again.",
        verified: false,
      };
    }

    // Don't delete the OTP yet - keep it until registration is complete
    // Mark it as verified by updating expiry to 10 more minutes for registration
    await UserEmailOtpVerification.updateOne(
      { email: email.toLowerCase().trim() },
      { expiresAt: Date.now() + 300000 } // 5 more minutes to complete registration
    );

    return {
      status: "VERIFIED",
      message:
        "Email verified successfully. You can now complete registration.",
      verified: true,
    };
  } catch (error: any) {
    console.error("Error verifying OTP:", error);
    return {
      status: "FAILED",
      message: error.message || "Failed to verify OTP",
      verified: false,
    };
  }
};

// Check if email has been verified (OTP exists and not expired)
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
