import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Mail,
  Lock,
  Loader2,
  Shield,
  CheckCircle,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import {
  apiSendPasswordResetOtp,
  apiVerifyPasswordResetOtp,
  apiResetPassword,
} from "../services/api";

function ForgotPassword() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState("");
  const [resetStep, setResetStep] = useState<"send" | "verify" | "reset">(
    "send"
  );
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Set email for loggedin user
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setEmail(user.email);
    }
  }, [isAuthenticated, user]);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Remove Error Message
  useEffect(() => {
    if (error.length > 0) {
      setTimeout(() => setError(""), 5000);
    }
  }, [error]);

  // Remove Success Message
  useEffect(() => {
    if (success.length > 0) {
      setTimeout(() => setSuccess(""), 5000);
    }
  }, [success]);

  // Handle send password reset OTP
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      await apiSendPasswordResetOtp(email);
      setSuccess("OTP sent to your email!");
      setResetStep("verify");
      setOtpTimer(600); // 10 minutes
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verify OTP
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const data = await apiVerifyPasswordResetOtp(email, resetOtp);
      if (data.verified) {
        setSuccess("OTP verified! Now set your new password.");
        setResetStep("reset");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiResetPassword(email, resetOtp, newPassword);

      setSuccess(data.message + " Redirecting to Homepage...");

      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/20 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card shadow-2xl rounded-2xl border border-border p-8">

          <div className="mb-6">
            {/* Back to Login/Profile Link */}
            <Link
              to={!isAuthenticated ? "/login" : "/my-profile"}
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              {!isAuthenticated ? "Back to Login" : "Back to Profile"}
            </Link>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold text-foreground mb-2">
              Forgot Password
            </h1>
            <p className="text-muted-foreground">
              {resetStep === "send" &&
                "Enter your email to receive a verification code"}
              {resetStep === "verify" &&
                "Enter the verification code sent to your email"}
              {resetStep === "reset" && "Create your new password"}
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 bg-destructive/20 border-l-4 border-destructive text-foreground p-4 rounded-lg flex items-center space-x-2">
              <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-500/20 border-l-4 border-green-500 text-foreground p-4 rounded-lg flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div
              className={`h-2 w-16 rounded-full transition-colors ${
                resetStep === "send" ? "bg-primary" : "bg-primary/30"
              }`}
            />
            <div
              className={`h-2 w-16 rounded-full transition-colors ${
                resetStep === "verify" ? "bg-primary" : "bg-primary/30"
              }`}
            />
            <div
              className={`h-2 w-16 rounded-full transition-colors ${
                resetStep === "reset" ? "bg-primary" : "bg-primary/30"
              }`}
            />
          </div>

          {/* Step 1: Send OTP */}
          {resetStep === "send" && (
            <form onSubmit={handleSendResetOtp} className="space-y-5">

              {/* Not Logged In */}
              {!isAuthenticated && (
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                      placeholder="Enter your email"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    We will send a verification code to this email address
                  </p>
                </div>
              )}

              {/* Logged In User */}

              {isAuthenticated && user && (
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
                      value={email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-muted text-muted-foreground"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    We'll send a verification code to this email address
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 font-semibold text-primary-foreground bg-primary border-2 border-transparent rounded-xl hover:border-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Code...
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

          {/* Step 2: Verify OTP */}
          {resetStep === "verify" && (
            <form onSubmit={handleVerifyResetOtp} className="space-y-5">
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
                    value={resetOtp}
                    onChange={(e) =>
                      setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    maxLength={4}
                    minLength={4}
                    placeholder="0000"
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition text-center text-2xl tracking-widest"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Code sent to: <span className="font-semibold">{email}</span>
                </p>
                {otpTimer > 0 && (
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    Code expires in {Math.floor(otpTimer / 60)}:
                    {(otpTimer % 60).toString().padStart(2, "0")}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || resetOtp.length !== 4}
                className="w-full py-3 font-semibold text-primary-foreground bg-primary rounded-xl border-2 border-transparent hover:border-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
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

              <button
                type="button"
                onClick={() => {
                  setResetStep("send");
                  setResetOtp("");
                  setError("");
                }}
                className="w-full text-sm text-muted-foreground hover:text-primary bg-white/10 py-3 rounded-xl transition text-center"
              >
                ← Back
              </button>
            </form>
          )}

          {/* Step 3: Reset Password */}
          {resetStep === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  At least 6 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Link for not logged in users */}
          {!isAuthenticated && (
            <div className="text-center mt-6">
              <p className="text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-primary hover:text-primary/80 font-semibold transition"
                >
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
