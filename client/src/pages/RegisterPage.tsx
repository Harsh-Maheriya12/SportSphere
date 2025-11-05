import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Shield, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { 
  apiSendOtp, 
  apiVerifyOtp, 
  apiResendOtp, 
  apiCheckUsername, 
  apiRegister 
} from "../services/api";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // Form fields
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // UI state
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const [usernameStatus, setUsernameStatus] = useState<
    "checking" | "available" | "taken" | "idle"
  >("idle");

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // DEBOUNCED USERNAME CHECK
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    const timerId = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const data = await apiCheckUsername(username);
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 500);
    return () => clearTimeout(timerId);
  }, [username]);

  // STEP 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const data = await apiSendOtp(email);
      setSuccess("OTP sent successfully! Check your email.");
      setStep("otp");
      setOtpTimer(600); // 10 minutes timer
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const data = await apiVerifyOtp(email, otp);
      
      if (data.verified) {
        setSuccess("Email verified successfully!");
        setStep("details");
      } else {
        throw new Error("OTP verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await apiResendOtp(email);
      setSuccess("OTP resent successfully!");
      setOtpTimer(600); // Reset timer
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Complete registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (usernameStatus === "taken") {
      setError("This username is already taken. Please choose another.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiRegister(username, email, password);

      // Registration successful - no token returned, user must login
      if (data.success) {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // RENDER USERNAME FEEDBACK
  const renderUsernameFeedback = () => {
    switch (usernameStatus) {
      case "checking":
        return (
          <p className="text-sm text-yellow-500 mt-1 flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></span>
            Checking availability...
          </p>
        );
      case "available":
        return (
          <p className="text-sm text-green-500 mt-1 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Username is available!
          </p>
        );
      case "taken":
        return (
          <p className="text-sm text-destructive mt-1">
            Username is already taken.
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white/10 px-4 py-12">
      <div className="w-full max-w-md bg-card shadow-2xl rounded-2xl p-8 space-y-6 border border-border">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-primary">
            Create an Account
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {step === "email" && "Enter your email to get started"}
            {step === "otp" && "Verify your email address"}
            {step === "details" && "Complete your registration"}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-16 rounded-full ${step === "email" ? "bg-primary" : "bg-primary/30"}`} />
          <div className={`h-2 w-16 rounded-full ${step === "otp" ? "bg-primary" : "bg-primary/30"}`} />
          <div className={`h-2 w-16 rounded-full ${step === "details" ? "bg-primary" : "bg-primary/30"}`} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/20 border-l-4 border-destructive text-foreground p-4 rounded-lg flex items-center space-x-2">
            <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/20 border-l-4 border-green-500 text-foreground p-4 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        )}

        {/* STEP 1: Email Input */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 font-semibold text-primary-foreground bg-primary rounded-xl border-2 hover:border-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Send Verification Code
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: OTP Verification */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Enter 4-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition text-center text-2xl tracking-widest"
                  required
                  maxLength={4}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Code sent to {email}
              </p>
            </div>

            {/* Timer */}
            {otpTimer > 0 && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Code expires in {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, "0")}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length !== 4}
              className="w-full py-3 font-semibold text-primary-foreground bg-primary rounded-xl border-2 hover:border-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verify Code
                </>
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isLoading || otpTimer > 240}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Didn't receive code? Resend
              </button>
            </div>

            {/* Back button */}
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              ← Change email address
            </button>
          </form>
        )}

        {/* STEP 3: Complete Registration */}
        {step === "details" && (
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Email (disabled) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address (Verified)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-muted text-muted-foreground"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                  required
                  minLength={3}
                  disabled={isLoading}
                />
              </div>
              {renderUsernameFeedback()}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                  required
                  minLength={6}
                  disabled={isLoading}
                />
                {/* Show/Hide password button */}
                <button
                  type="button"
                  onClick={() => setShowPassword((showPassword) => !showPassword)}
                  className="absolute inset-y-0 right-2 flex items-center px-2 text-muted-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                At least 6 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || usernameStatus === "taken"}
              className="w-full py-3 font-semibold text-primary-foreground bg-primary rounded-xl border-2 hover:border-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Complete Registration"
              )}
            </button>
          </form>
        )}

        {/* Login Link */}
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
