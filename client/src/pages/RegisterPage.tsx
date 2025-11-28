import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Shield,
  Loader2,
  CheckCircle,
  Upload,
  Calendar,
  Users,
} from "lucide-react";
import {
  apiSendOtp,
  apiVerifyOtp,
  apiResendOtp,
  apiCheckUsername,
  apiRegister,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import defaultPhoto from "../assets/user_default.jpeg";

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAuth } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"player" | "venue-owner" | "coach">(
    "player"
  );
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [usernameStatus, setUsernameStatus] = useState<
    "checking" | "available" | "taken" | "idle"
  >("idle");

  // Google OAuth specific states
  const [isGoogleOAuth, setIsGoogleOAuth] = useState(false);
  const [googlePictureUrl, setGooglePictureUrl] = useState("");

  // Check for Google OAuth flow on mount
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    // console.log("RegisterPage - Checking OAuth param:", oauth);

    if (oauth === "google") {
      const googleDataStr = sessionStorage.getItem("googleOAuthData");
      // console.log("RegisterPage - Google OAuth data from session:", googleDataStr);

      if (googleDataStr) {
        try {
          const googleData = JSON.parse(googleDataStr);
          // console.log("RegisterPage - Parsed Google data:", googleData);

          // Pre-fill email and skip to details step
          setEmail(googleData.email);
          setUsername(googleData.name.replace(/\s+/g, '').toLowerCase() || "");
          setIsGoogleOAuth(true);
          setGooglePictureUrl(googleData.picture || "");
          setStep("details");

          // console.log("RegisterPage - Set isGoogleOAuth to true, skipping to details");

          // Don't clear session storage immediately - keep it for verification
          // sessionStorage.removeItem("googleOAuthData");
        } catch (error) {
          console.error("Error parsing Google OAuth data:", error);
        }
      } else {
        console.log("RegisterPage - No Google OAuth data found in sessionStorage");
      }
    }
  }, [searchParams]);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Username Check
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

      if (data.success) {
        setSuccess("OTP sent successfully! Check your email.");
        setStep("otp");
        setOtpTimer(600); // 10 minutes timer
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message);
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
      setError(err.message);
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
      setError(err.message);
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

    if ((role === "coach" || role === "venue-owner") && !proof) {
      setError("Proof document is required for coaches and venue owners");
      return;
    }

    setIsLoading(true);

    try {
      // Default photo
      let photoToUpload = profilePhoto;
      if (!photoToUpload && !isGoogleOAuth) {
        const response = await fetch(defaultPhoto);
        const blob = await response.blob();
        photoToUpload = new File([blob], "default-avatar.png", { type: "image/png" });
      }

      const data = await apiRegister(
        username,
        email,
        isGoogleOAuth ? "" : password, // No password for Google OAuth
        role,
        parseInt(age),
        gender,
        photoToUpload || profilePhoto!,
        proof,
        isGoogleOAuth ? "google" : "local" // Pass auth provider
      );

      if (data.success) {
        // For Google OAuth, auto-login and redirect to dashboard
        if (isGoogleOAuth && data.token && data.user) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          refreshAuth(); // Update auth context immediately
          setSuccess("Registration successful! Logging you in...");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        } else {
          // For local registration, redirect to login
          setSuccess("Registration successful! Redirecting to login...");
          setTimeout(() => {
            navigate("/login");
          }, 2500);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Username Check
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
        {/* Header */}
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
          <div
            className={`h-2 w-16 rounded-full ${step === "email" ? "bg-primary" : "bg-primary/30"
              }`}
          />
          <div
            className={`h-2 w-16 rounded-full ${step === "otp" ? "bg-primary" : "bg-primary/30"
              }`}
          />
          <div
            className={`h-2 w-16 rounded-full ${step === "details" ? "bg-primary" : "bg-primary/30"
              }`}
          />
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

        {/* STEP 1: Send Otp */}
        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            {/* Email */}
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

        {/* STEP 2: Verify OTP */}
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
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
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
                  Code expires in {Math.floor(otpTimer / 60)}:
                  {String(otpTimer % 60).padStart(2, "0")}
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
                disabled={isLoading || otpTimer > 100}
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

        {/* STEP 3: Fill Form */}
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
              {isGoogleOAuth && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified via Google
                </p>
              )}
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

            {/* Password - Only for local registration */}
            {!isGoogleOAuth && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                    required={!isGoogleOAuth}
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  At least 6 characters
                </p>
              </div>
            )}

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Your Role <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition appearance-none cursor-pointer"
                  required
                  disabled={isLoading}
                >
                  <option value="player">Player</option>
                  <option value="coach">Coach</option>
                  <option value="venue-owner">Venue Owner</option>
                </select>
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Age <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                  required
                  min="13"
                  max="120"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Gender <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {/* Male button */}
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all ${gender === "male"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  disabled={isLoading}
                >
                  Male
                </button>

                {/* Female button */}
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all ${gender === "female"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  disabled={isLoading}
                >
                  Female
                </button>

                {/* Other button */}
                <button
                  type="button"
                  onClick={() => setGender("other")}
                  className={`py-3 px-4 rounded-xl border-2 transition-all ${gender === "other"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  disabled={isLoading}
                >
                  Other
                </button>
              </div>
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Profile Photo {!isGoogleOAuth && <span className="text-muted-foreground text-xs">(optional - default will be used)</span>}
              </label>

              {isGoogleOAuth && googlePictureUrl && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-muted rounded-xl border border-border">
                  <img
                    src={googlePictureUrl}
                    alt="Google profile"
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">Using Google profile picture</p>
                    <p className="text-xs text-muted-foreground">You can upload a custom photo below (optional)</p>
                  </div>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                  className="hidden"
                  id="profilePhoto"
                  disabled={isLoading}
                />
                <label
                  htmlFor="profilePhoto"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-background"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground">
                    {profilePhoto
                      ? profilePhoto.name
                      : isGoogleOAuth
                        ? "Upload custom photo (optional)"
                        : "Choose profile photo"}
                  </span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or JPEG (max 5MB)
              </p>
            </div>

            {/* Proof Document Upload  */}
            {(role === "coach" || role === "venue-owner") && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Verification Proof <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setProof(e.target.files?.[0] || null)}
                    className="hidden"
                    id="proof"
                    required
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="proof"
                    className="flex items-center justify-center gap-2 w-full py-3 px-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors bg-background"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {proof ? proof.name : "Upload verification document"}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF format only (max 5MB) - License, certificate, or ID
                </p>
              </div>
            )}

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
}

export default RegisterPage;