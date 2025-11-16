import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Mail,
  Calendar,
  Users,
  Camera,
  Lock,
  Loader2,
  Save,
  Shield,
  CheckCircle,
  Edit,
  X,
  KeyRound,
} from "lucide-react";
import {
  apiGetProfile,
  apiUpdateProfile,
  apiCheckUsername,
} from "../services/api";

function MyProfile() {
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState(""); 
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [age, setAge] = useState("");
  const [originalAge, setOriginalAge] = useState(""); 
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [originalGender, setOriginalGender] = useState<
    "male" | "female" | "other"
  >("male");
  const [profilePhoto, setProfilePhoto] = useState<string>("");
  const [createdAt, setCreatedAt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [newProfilePhoto, setNewProfilePhoto] = useState<File | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");

  // Remove Error Message
  useEffect(() => {
    if (error.length > 0) {
      {
        setTimeout(() => setError(""), 3000);
      }
    }
  }, [error]);

  // Remove Success Message
  useEffect(() => {
    if (success.length > 0) {
      {
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  }, [success]);

  // Username availability check
  useEffect(() => {
    // Don't check if username is too short
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    // Don't check if username hasn't changed from original
    if (username === originalUsername) {
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
  }, [username, originalUsername]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetching(true);
      try {
        const data = await apiGetProfile();
        setUsername(data.user.username);
        setOriginalUsername(data.user.username);
        setEmail(data.user.email);
        setRole(data.user.role);
        const fetchedAge = data.user.age?.toString() || "";
        const fetchedGender =
          (data.user.gender as "male" | "female" | "other") || "male";
        setAge(fetchedAge);
        setOriginalAge(fetchedAge);
        setGender(fetchedGender);
        setOriginalGender(fetchedGender);
        setProfilePhoto(data.user.profilePhoto || "");
        setCreatedAt(data.user.createdAt);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle profile photo change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate username availability (only if it changed)
    if (username !== originalUsername && usernameStatus === "taken") {
      setError("Username is already taken. Please choose a different one.");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiUpdateProfile(
        username,
        parseInt(age),
        gender,
        newProfilePhoto
      );

      setSuccess(data.message);
      setIsEditing(false);
      setNewProfilePhoto(null);
      setPreviewPhoto("");

      if (data.user.profilePhoto) {
        setProfilePhoto(data.user.profilePhoto);
      }
      if (data.user.username) {
        setOriginalUsername(data.user.username);
      }
     
      setOriginalAge(age);
      setOriginalGender(gender);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/10 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-primary mb-2">
            My Profile
          </h1>
          <p className="text-foreground">Manage your account information</p>
        </div>

        {/* Error/Success*/}
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

        {/* Profile Card */}
        <div className="bg-card shadow-2xl rounded-2xl border border-border overflow-hidden mb-6">
          {isFetching ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Profile Photo */}
              <div className="relative h-32">
                <div className="absolute -bottom-16 left-8">
                  <div className="relative">
                    <img
                      src={previewPhoto || profilePhoto}
                      alt={username}
                      className="w-32 h-32 rounded-full object-cover border-4 border-white/70 shadow-lg"
                    />
                    {isEditing && (
                      <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 shadow-lg transition">
                        <Camera className="w-5 h-5" />
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Edit Profile Button */}
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="absolute top-4 right-4 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 hover:text-primary transition flex items-center gap-2 border border-white/30"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="pt-20 px-8 pb-8">
                {!isEditing ? (
                  /* View Mode */
                  <div className="space-y-6">
                    <div>
                      {/* UserName */}
                      <h2 className="text-3xl font-bold text-foreground mb-1">
                        {username}
                      </h2>
                      {/* ID */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{email}</span>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                      <Shield className="w-4 h-4" />
                      <span className="font-semibold capitalize">
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </span>
                    </div>

                    {/* Details*/}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
                      <div className="space-y-1">
                        {/* Age */}
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Age
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {age} years
                        </p>
                      </div>
                      {/* Gender */}
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Gender
                        </p>
                        <p className="text-lg font-semibold text-foreground capitalize">
                          {gender.charAt(0).toUpperCase() + gender.slice(1)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Member Since
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {new Date(createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Edit Mode
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-foreground">
                        Edit Profile
                      </h3>
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
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:outline-none bg-background text-foreground transition ${
                            usernameStatus === "taken"
                              ? "border-red-500 focus:ring-red-500"
                              : usernameStatus === "available"
                              ? "border-green-500 focus:ring-green-500"
                              : "border-border focus:ring-primary"
                          }`}
                          required
                          minLength={3}
                          disabled={isLoading}
                        />
                        {/* Username status */}
                        {username !== originalUsername && username.length >= 3 && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            {usernameStatus === "checking" && (
                              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                            )}
                            {usernameStatus === "available" && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                            {usernameStatus === "taken" && (
                              <X className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        )}
                      </div>
                      {/* Username availability message */}
                      {username !== originalUsername && username.length >= 3 && (
                        <p
                          className={`text-sm mt-1 ${
                            usernameStatus === "available"
                              ? "text-green-600"
                              : usernameStatus === "taken"
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {usernameStatus === "checking" &&
                            "Checking availability..."}
                          {usernameStatus === "available" &&
                            "Username is available"}
                          {usernameStatus === "taken" &&
                            "Username is already taken"}
                        </p>
                      )}
                    </div>

                    {/* Age and Gender*/}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Age */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Age
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            min="13"
                            max="120"
                            className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Gender
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <select
                            value={gender}
                            onChange={(e) =>
                              setGender(
                                e.target.value as "male" | "female" | "other"
                              )
                            }
                            className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground transition appearance-none cursor-pointer"
                            required
                            disabled={isLoading}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Save and Cancel Buttons */}
                    <div className="flex gap-3 pt-4">
                      {/* Save */}
                      <button
                        type="submit"
                        disabled={
                          isLoading ||
                          (username !== originalUsername &&
                            usernameStatus === "taken") ||
                          usernameStatus === "checking"
                        }
                        className="flex-1 py-3 font-semibold text-primary-foreground bg-primary rounded-xl border-2 border-transparent hover:border-white transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Save Changes
                          </>
                        )}
                      </button>
                      {/* Cancel */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setUsername(originalUsername);
                          setAge(originalAge);
                          setGender(originalGender);
                          setNewProfilePhoto(null);
                          setPreviewPhoto("");
                          setUsernameStatus("idle");
                        }}
                        className="px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 hover:text-primary transition"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* Password Reset Card */}
        <div className="bg-card shadow-2xl rounded-2xl border border-border p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-xl">
              <Lock className="w-6 h-6 text-red-500 rounded-none" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Password & Security
              </h2>
              <p className="text-sm text-muted-foreground">
                Keep your account secure
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Keep your account secure by updating your password regularly. We
              will send a verification code to your email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/forgot-password"
                className="flex-1 px-6 py-3 bg-primary text-secondary rounded-xl hover:border-white border-2 border-transparent hover:border-primary transition-colors shadow-md flex items-center justify-center gap-2 font-semibold"
              >
                <KeyRound className="w-5 h-5" />
                Reset Password
              </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Use "Reset Password" to change your password securely.
            </p>
          </div>
        </div>
      </div>
    </div>
          
  );
}

export default MyProfile;
