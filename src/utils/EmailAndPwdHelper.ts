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
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
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
      `<div style="
        font-family: 'Arial', sans-serif;
        background-color: #0d0d0d;
        color: #ffffff;
        max-width: 600px;
        margin: 0 auto;
        padding: 30px 25px;
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(255, 140, 0, 0.25);
      ">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #ff8c00; margin-bottom: 10px; font-size: 28px;">SportSphere</h1>
        </div>

        <div style="
          background: linear-gradient(145deg, #1a1a1a, #111111);
          border: 1px solid #222;
          border-radius: 10px;
          padding: 25px;
        ">
          <h3 style="color: #ff8c00; text-align: center; margin-bottom: 15px;">
            Verify Your Email
          </h3>
          <p style="color: #dddddd; font-size: 15px; text-align: center; margin-bottom: 10px;">
            Welcome to <strong>SportSphere</strong>! You're just one step away from activating your account.
          </p>
          <p style="color: #cccccc; text-align: center; margin-bottom: 20px;">
            Enter this code to verify your email address:
          </p>
          
          <div style="
            background-color: #161616;
            border: 1px dashed #ff8c00;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          ">
            <h3 style="
              color: #ff8c00;
              font-size: 36px;
              letter-spacing: 6px;
              margin: 0;
              font-weight: bold;
            ">${otp}</h3>
          </div>

          <p style="color: #aaaaaa; text-align: center;">
            This code will expire in <strong style="color: #ff8c00;">10 minutes</strong>.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #777777; font-size: 12px; line-height: 1.5;">
            If you didn’t request this verification, you can safely ignore this message.<br/>
            © ${new Date().getFullYear()} <strong style="color: #ff8c00;">SportSphere</strong>. All rights reserved.
          </p>
        </div>
      </div>`
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

    // Save and send the email
    await newOtpVerificationRecord.save();
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

    const isValidOtp = await bcrypt.compare(otp, hashedOtp);

    if (!isValidOtp) {
      return {
        status: "FAILED",
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

    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email.toLowerCase().trim(),
      subject: "Reset Password - SportSphere",
      html: 
      `<div style="
        font-family: 'Arial', sans-serif;
        background-color: #0d0d0d;
        color: #ffffff;
        max-width: 600px;
        margin: 0 auto;
        padding: 30px 25px;
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(255, 140, 0, 0.25);
      ">
        <div style="text-align: center; margin-bottom: 25px;">
          <h1 style="color: #ff8c00; margin: 0; font-size: 28px; margin-bottom: 6px;">SportSphere</h1>
          
        </div>

        <div style="
          background: linear-gradient(145deg, #1a1a1a, #111111);
          border: 1px solid #222;
          border-radius: 10px;
          padding: 25px;
        ">
          <h3 style="color: #ff8c00; text-align: center; margin-bottom: 15px;">
            Reset Your Password
          </h3>
          <p style="color: #dddddd; font-size: 15px; text-align: center; margin-bottom: 10px;">
            We received a request to reset the password for your <strong>SportSphere</strong> account.
          </p>
          <p style="color: #cccccc; text-align: center; margin-bottom: 20px;">
            Use the OTP below to proceed with resetting your password:
          </p>
          
          <div style="
            background-color: #161616;
            border: 1px dashed #ff8c00;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          ">
            <h3 style="
              color: #ff8c00;
              font-size: 36px;
              letter-spacing: 6px;
              margin: 0;
              font-weight: bold;
            ">
              ${otp}
            </h3>
          </div>

          <p style="color: #aaaaaa; text-align: center;">
            This code will expire in <strong style="color: #ff8c00;">10 minutes</strong>.
          </p>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #777777; font-size: 12px; line-height: 1.5;">
            If you didn't request a password reset, please ignore this email.<br/>
            Your account remains secure.<br/>
            © ${new Date().getFullYear()} <strong style="color: #ff8c00;">SportSphere</strong>. All rights reserved.
          </p>
        </div>
      </div>`,
    };

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
    await transporter.sendMail(mailOptions);

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
