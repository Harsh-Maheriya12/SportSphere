import express from "express";
import asyncHandler from "express-async-handler";
import { upload } from "../middleware/multer";
import { validateRegister } from "../middleware/validation"
import {
  register,
  login,
  checkUsername,
  checkEmail,
  sendOtp,
  verifyOtpController,
  resendOtp,
  sendPasswordResetOtpController,
  verifyPasswordResetOtpController,
  resetPassword,
} from "../controllers/authController";

const router = express.Router();

// Registration and login
router.post("/register", upload, validateRegister, asyncHandler(register)); 
router.post("/login", asyncHandler(login)); 

// Username and email availability checks
router.post("/check-username", asyncHandler(checkUsername));
router.post("/check-email", asyncHandler(checkEmail)); 

// Email verification flow ( using otp)
router.post("/send-otp", asyncHandler(sendOtp)); 
router.post("/verify-otp", asyncHandler(verifyOtpController)); 
router.post("/resend-otp", asyncHandler(resendOtp)); 

// Password reset Using otp
router.post("/password-reset/send-otp", asyncHandler(sendPasswordResetOtpController)); 

// Send otp
router.post("/password-reset/verify-otp", asyncHandler(verifyPasswordResetOtpController)); 

// Verify Otp
router.post("/password-reset/reset", asyncHandler(resetPassword));

export default router;
