import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import UserEmailOtpVerification from '../models/UserEmailOtpVerification';
import User from '../models/User';
import transporter from '../config/transporter';

// Send OTP verification email (before registration)

export const sendOtpVerificationMail = async (
  email: string
): Promise<{ status: string; message: string; data?: { email: string } }> => {
  try {

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        status: 'FAILED',
        message: 'Email already registered. Please login.',
      };
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: 'Email Verification in SportSphere Plaform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff8c00;">Email Verification</h2>
          <p>Thank you for starting your registration with SportSphere!</p>
          <p>Enter this OTP code to verify your email address:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #ff8c00; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666;">This code will expire in <strong>30 minutes</strong>.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
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
      status: 'PENDING',
      message: 'Verification OTP email sent successfully',
      data: { email },
    };
  } catch (error: any) {
    console.error('Error sending OTP email:', error);
    return {
      status: 'FAILED',
      message: error.message || 'Failed to send OTP email',
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
        status: 'FAILED',
        message: 'OTP and email are required',
        verified: false,
      };
    }

    // Find the OTP record
    const otpRecords = await UserEmailOtpVerification.find({ 
      email: email.toLowerCase().trim() 
    });

    if (otpRecords.length === 0) {
      return {
        status: 'FAILED',
        message: 'No OTP found for this email. Please request a new one.',
        verified: false,
      };
    }

    const { expiresAt, otp: hashedOtp } = otpRecords[0];

    const currentTime = new Date();

    if (expiresAt < currentTime) {

      // Time expired, delete the record
      await UserEmailOtpVerification.deleteMany({ email: email.toLowerCase().trim() });
      return {
        status: 'FAILED',
        message: 'Code has expired. Please request again.',
        verified: false,
      };

    }

    // Verify OTP
    const isValidOtp = await bcrypt.compare(otp, hashedOtp);

    if (!isValidOtp) {
      return {
        status: 'FAILED',
        message: 'Invalid OTP. Please try again.',
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
      status: 'VERIFIED',
      message: 'Email verified successfully. You can now complete registration.',
      verified: true,
    };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return {
      status: 'FAILED',
      message: error.message || 'Failed to verify OTP',
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
      await UserEmailOtpVerification.deleteMany({ email: email.toLowerCase().trim() });
      return false;
    }

    
    return true;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
};