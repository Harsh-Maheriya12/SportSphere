import { AuthResponse, RegisterResponse, User } from "../types/index";

const BASE_URL = "http://localhost:5000/api";

// Centralized request handler with auto JWT token and error handling
const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};

  // Don't set Content-Type for FormData (browser handles boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Featch request
  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    let errorMessage = "An API error occurred";
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      errorMessage = data.errors[0].message || data.errors[0].msg;
    } else if (data.message) {
      errorMessage = data.message;
    }
    throw new Error(errorMessage);
  }

  return data;
};

// Login
export const apiLogin = (
  email: string,
  password: string
): Promise<AuthResponse> => {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
};

// Registration
export const apiRegister = (
  username: string,
  email: string,
  password: string,
  role: string,
  age: number,
  gender: string,
  profilePhoto: File,
  proof?: File | null,
  authProvider?: string
): Promise<RegisterResponse> => {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("email", email);
  formData.append("password", password);
  formData.append("role", role);
  formData.append("age", age.toString());
  formData.append("gender", gender);
  formData.append("profilePhoto", profilePhoto);

  if (authProvider) {
    formData.append("authProvider", authProvider);
  }

  if (proof) {
    formData.append("proof", proof);
  }

  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: formData,
  });
};

// OTP Verification (Registration)

export const apiSendOtp = (
  email: string
): Promise<{ success: boolean; message: string; data?: { email: string } }> => {
  return request("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const apiVerifyOtp = (
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; verified: boolean }> => {
  return request("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
};

export const apiResendOtp = (
  email: string
): Promise<{ success: boolean; message: string; data?: { email: string } }> => {
  return request("/auth/resend-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

// Username Availability Check

export const apiCheckUsername = (
  username: string
): Promise<{ success: boolean; available: boolean }> => {
  return request("/auth/check-username", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
};

// User Profile view and update

export const apiGetProfile = (): Promise<{
  success: boolean;
  user: User & {
    createdAt: string;
  };
}> => {
  return request("/users/profile", {
    method: "GET",
  });
};

export const apiUpdateProfile = (
  username: string,
  age: number,
  gender: string,
  profilePhoto?: File | null
): Promise<{ success: boolean; message: string; user: User }> => {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("age", age.toString());
  formData.append("gender", gender);

  if (profilePhoto) {
    formData.append("profilePhoto", profilePhoto);
  }

  return request("/users/profile", {
    method: "PUT",
    body: formData,
  });
};

// Reset Password

export const apiSendPasswordResetOtp = (
  email: string
): Promise<{ success: boolean; message: string }> => {
  return request("/auth/password-reset/send-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const apiVerifyPasswordResetOtp = (
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; verified: boolean }> => {
  return request("/auth/password-reset/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
};

export const apiResetPassword = (
  email: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  return request("/auth/password-reset/reset", {
    method: "POST",
    body: JSON.stringify({ email, otp, newPassword }),
  });
};

// Get All Coaches
export const apiGetAllCoaches = (): Promise<{
  success: boolean;
  coaches: any[];
}> => {
  return request("/coaches/get-all-coaches", {
    method: "GET",
  });
};

// Coach by ID
export const apiGetCoachProfile = (
  id: string
): Promise<{ success: boolean; coach: any }> => {
  return request(`/coaches/get-coach-profile/${id}`, {
    method: "GET",
  });
};

// Get logged-in coach's own details
export const apiGetMyCoachDetails = (): Promise<{
  success: boolean;
  coachDetail: any | null;
  message?: string;
}> => {
  return request("/coaches/get-my-details", {
    method: "GET",
  });
};

// Profile update for coach
export const apiCreateOrUpdateCoachDetail = (
  sports?: string[],
  description?: string,
  experience?: number,
  pricing?: number,
  city?: string,
  state?: string,
  country?: string,
  address?: string,
  photos?: File[]
): Promise<{ success: boolean; message: string; coachDetail: any }> => {
  const formData = new FormData();

  if (sports && sports.length > 0) {
    formData.append("sports", JSON.stringify(sports));
  }
  if (description) formData.append("description", description);
  if (experience !== undefined)
    formData.append("experience", experience.toString());
  if (pricing !== undefined) formData.append("pricing", pricing.toString());
  if (city) formData.append("city", city);
  if (state) formData.append("state", state);
  if (country) formData.append("country", country);
  if (address !== undefined) formData.append("address", address);

  if (photos && photos.length > 0) {
    photos.forEach((photo) => {
      formData.append("photos", photo);
    });
  }

  return request("/coaches/create-or-update-details", {
    method: "POST",
    body: formData,
  });
};

// Delete photo from coach's gallery
export const apiDeleteCoachPhoto = (
  photoUrl: string
): Promise<{ success: boolean; message: string }> => {
  return request("/coaches/delete-photo", {
    method: "DELETE",
    body: JSON.stringify({ photoUrl }),
  });
};

// Coach Slot Management

// Get available slots for specific coachID
export const apiGetCoachSlots = (
  coachId: string
): Promise<{ success: boolean; slots: any[] }> => {
  return request(`/coaches/get-coach-slots/${coachId}`, {
    method: "GET",
  });
};

// Get coach's own slots
export const apiGetMyCoachSlots = (): Promise<{
  success: boolean;
  slots: any[];
}> => {
  return request("/coaches/get-my-slots", {
    method: "GET",
  });
};

// Add slot for coach
export const apiCreateCoachSlot = (
  date: string,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; message: string; slot: any }> => {
  return request("/coaches/create-slot", {
    method: "POST",
    body: JSON.stringify({ date, startTime, endTime }),
  });
};

// Delete slot for coach
export const apiDeleteCoachSlot = (
  slotId: string
): Promise<{ success: boolean; message: string }> => {
  return request(`/coaches/delete-slot/${slotId}`, {
    method: "DELETE",
  });
};

// Coach Booking

// Request coach booking (for players)
export const apiRequestCoachBooking = (
  slotId: string
): Promise<{ success: boolean; message: string; booking: any }> => {
  return request("/coaches/request-booking", {
    method: "POST",
    body: JSON.stringify({ slotId }),
  });
};

// Get coach's all bookings (for coaches)
export const apiGetCoachsAllBooking = (): Promise<{
  success: boolean;
  bookings: any[];
}> => {
  return request("/coaches/get-booking-requests", {
    method: "GET",
  });
};

// Accept booking request (for coaches)
export const apiCoachAcceptBookingRequest = (
  bookingId: string
): Promise<{ success: boolean; message: string; booking: any }> => {
  return request(`/coaches/accept-booking/${bookingId}`, {
    method: "PUT",
  });
};

// Reject booking request (for coaches)
export const apiCoachRejectBookingRequest = (
  bookingId: string,
  rejectionReason?: string
): Promise<{ success: boolean; message: string; booking: any }> => {
  return request(`/coaches/reject-booking/${bookingId}`, {
    method: "PUT",
    body: JSON.stringify({ rejectionReason }),
  });
};

// Get player's coach bookings (for players)
export const apiGetMyCoachBookings = (): Promise<{
  success: boolean;
  bookings: any[];
}> => {
  return request("/coaches/get-my-bookings", {
    method: "GET",
  });
};
