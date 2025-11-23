import { AuthResponse, RegisterResponse, User, Game, JoinRequest, ApiResponse } from "../types/index";

// Need to change base URL based on environment
let BASE_URL = "/api";
// let BASE_URL = "https://sportsphere-f6f0.onrender.com/api";

// if(process.env.NODE_ENV === "production") {
  // let BASE_URL = "https://sportsphere-f6f0.onrender.com";
// }

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

  if (sports !== undefined) {
    formData.append("sports", JSON.stringify(sports));
  }
  if (description !== undefined) formData.append("description", description);
  if (experience !== undefined)
    formData.append("experience", experience.toString());
  if (pricing !== undefined) formData.append("pricing", pricing.toString());
  if (city !== undefined) formData.append("city", city);
  if (state !== undefined) formData.append("state", state);
  if (country !== undefined) formData.append("country", country);
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

// ============ Venue APIs ============

// Get all venues
export const apiGetAllVenues = (): Promise<{
  success: boolean;
  venues: any[];
}> => {
  return request("/venues", {
    method: "GET",
  });
};

// Get venue by ID
export const apiGetVenueById = (id: string): Promise<{
  success: boolean;
  venue: any;
}> => {
  return request(`/venues/${id}`, {
    method: "GET",
  });
};

// Get subvenues for a venue
export const apiGetSubVenuesByVenue = (venueId: string): Promise<{
  success: boolean;
  subVenues: any[];
}> => {
  return request(`/subvenues/venue/${venueId}`, {
    method: "GET",
  });
};

// Get time slots for a subvenue on a specific date
export const apiGetSlotsForSubVenue = (
  subVenueId: string,
  date: string
): Promise<{
  success: boolean;
  timeSlot?: any;
  slots?: any[];
}> => {
  return request(`/timeslots/subvenue/${subVenueId}?date=${date}`, {
    method: "GET",
  });
};

// Book venue slot (direct booking)
export const apiBookVenueSlot = (
  subVenueId: string,
  timeSlotDocId: string,
  slotId: string,
  sport: string
): Promise<{
  success: boolean;
  url?: string;
  bookingId?: string;
  message?: string;
}> => {
  return request("/bookings/direct", {
    method: "POST",
    body: JSON.stringify({ subVenueId, timeSlotDocId, slotId, sport }),
  });
};

// Retry payment for a booking
export const apiRetryPayment = (
  bookingId: string
): Promise<{
  success: boolean;
  url: string;
  bookingId: string;
}> => {
  return request("/bookings/retry", {
    method: "POST",
    body: JSON.stringify({ bookingId }),
  });
};

// ============ Venue Owner APIs ============

// Get my venues (for venue owners)
export const apiGetMyVenues = (): Promise<{
  success: boolean;
  venues: any[];
}> => {
  return request("/venues/my-venues", {
    method: "GET",
  });
};

// Create venue (for venue owners)
export const apiCreateVenue = (
  name: string,
  description: string,
  phone: string,
  address: string,
  city: string,
  state: string,
  coordinates: [number, number],
  amenities: string[],
  images?: string[]
): Promise<{
  success: boolean;
  venue: any;
}> => {
  return request("/venues", {
    method: "POST",
    body: JSON.stringify({
      name,
      description,
      phone,
      address,
      city,
      state,
      location: {
        type: "Point",
        coordinates,
      },
      amenities,
      images: images || [],
    }),
  });
};

// Update venue
export const apiUpdateVenue = (
  id: string,
  updates: any
): Promise<{
  success: boolean;
  venue: any;
}> => {
  return request(`/venues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

// Delete venue
export const apiDeleteVenue = (id: string): Promise<{
  success: boolean;
  message: string;
}> => {
  return request(`/venues/${id}`, {
    method: "DELETE",
  });
};

// Create subvenue
export const apiCreateSubVenue = (
  venueId: string,
  name: string,
  description: string,
  sports: { name: string; minPlayers: number; maxPlayers: number }[],
  images?: string[]
): Promise<{
  success: boolean;
  subVenue: any;
}> => {
  return request("/subvenues", {
    method: "POST",
    body: JSON.stringify({
      venue: venueId,
      name,
      description,
      sports,
      images: images || [],
      status: "active",
    }),
  });
};

// Update subvenue
export const apiUpdateSubVenue = (
  id: string,
  updates: any
): Promise<{
  success: boolean;
  subVenue: any;
}> => {
  return request(`/subvenues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

// Delete subvenue
export const apiDeleteSubVenue = (id: string): Promise<{
  success: boolean;
  message: string;
}> => {
  return request(`/subvenues/${id}`, {
    method: "DELETE",
  });
};

// Generate time slots for a subvenue
export const apiGenerateTimeSlots = (
  subVenueId: string,
  date: string
): Promise<{
  success: boolean;
  timeSlot?: any;
  message?: string;
}> => {
  return request("/timeslots/generate", {
    method: "POST",
    body: JSON.stringify({
      subVenue: subVenueId,
      date,
    }),
  });
};

// Update a specific time slot
export const apiUpdateTimeSlot = (
  slotId: string,
  prices?: { [sport: string]: number },
  status?: "available" | "booked" | "blocked",
  bookedForSport?: string | null
): Promise<{
  success: boolean;
  slot: any;
  timeSlotId: string;
}> => {
  const body: any = {};
  if (prices !== undefined) body.prices = prices;
  if (status !== undefined) body.status = status;
  if (bookedForSport !== undefined) body.bookedForSport = bookedForSport;

  return request(`/timeslots/slot/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
};

// Delete time slots for a subvenue on a specific date
export const apiDeleteTimeSlots = (
  subVenueId: string,
  date: string
): Promise<{
  success: boolean;
  message: string;
}> => {
  return request(`/timeslots/subvenue/${subVenueId}?date=${date}`, {
    method: "DELETE",
  });
};

// Get player's venue bookings
export const apiGetMyVenueBookings = (): Promise<{
  success: boolean;
  bookings: any[];
}> => {
  return request("/bookings/my-bookings", {
    method: "GET",
  });
};

// Chatbot

export const apiSendChatMessage = (
  message: string
): Promise<{ success: boolean; message: string }> => {
  return request("/chatbot", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
};

// ============ Game APIs ============

// Host a new game
export const apiHostGame = (
  payload: {
    sport: string;
    venueId: string;
    subVenueId: string;
    timeSlotDocId: string;
    slotId: string;
    description: string;
    playersNeeded: { min: number; max: number };
  }
): Promise<{ success: boolean; message: string; game: Game }> => {
  return request(`/games/host`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// cancel a hosted game(host only)
export const apiCancelGame = (
  gameId: string
): Promise<{ success: boolean; message: string }> => {
  return request(`/games/${gameId}/cancel`, {
    method: "PATCH",
  });
};

// Leave a game(approved player only)
export const apiLeaveGame = (
  gameId: string
): Promise<{ success: boolean; message: string; status: string }> => {
  return request(`/games/${gameId}/leave`, {
    method: "DELETE",
  });
};

// create a join request
export const apiCreateJoinRequest = (
  gameId: string
): Promise<{ success: boolean; message: string }> => {
  return request(`/games/${gameId}/join`, {
    method: "POST",
  });
};

// cancel a join request
export const apiCancelJoinRequest = (
  gameId: string
): Promise<{ success: boolean; message: string }> => {
  return request(`/games/${gameId}/join/cancel-request`, {
    method: "DELETE",
  });
};

// approve a join request (host only)
export const apiApproveJoinRequest = (
  gameId: string,
  playerId: string
): Promise<{ success: boolean; message: string; currentApprovedPlayers: number; status: string }> => {
  return request(`/games/${gameId}/approve/${playerId}`, {
    method: "PATCH",
  });
};

// reject a join request (host only)
export const apiRejectJoinRequest = (
  gameId: string,
  playerId: string
): Promise<{ success: boolean; message: string }> => {
  return request(`/games/${gameId}/reject/${playerId}`, {
    method: "PATCH",
  });
};

// complete a game (host only)
export const apiCompleteGame = (
  gameId: string
): Promise<{ success: boolean; message: string }> => {
  return request(`/games/${gameId}/complete`, {
    method: "PATCH",
  });
};

// rate venue after game
export const apiRateVenue = (
  gameId: string,
  rating: number
): Promise<{ success: boolean; message: string }> => {
  return request(`/games/${gameId}/rate`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
};

// get game by id
export const apiGetGameById = (
  gameId: string
): Promise<{ success: boolean; game: Game }> => {
  return request(`/games/${gameId}`, {
    method: "GET",
  });
};

// get all available games with filters
export const apiGetGames = (filters?: {
  sport?: string;
  venueId?: string;
  startDate?: string;
  endDate?: string;
  lng?: number;
  lat?: number;
  radius?: number;
}): Promise<{ success: boolean; games: Game[] }> => {
  const params = new URLSearchParams(filters as any).toString();
  return request(`/games?${params}`, { method: "GET" });
};

// get my bookings 
export const apiGetMyBookings = (): Promise<{
  success: boolean;
  bookings: {
    hosted: Game[];
    joined: Game[];
    pending: Game[];
    rejected: Game[];
    cancelled: Game[];
    booked: Game[];
    completed: Game[];
  };
}> => {
  return request(`/games/my-bookings`, { method: "GET" });
};
