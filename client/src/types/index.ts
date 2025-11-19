// User
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  age?: number;
  gender?: string;
  profilePhoto?: string;
  proof?: string;
}

// Login Response
export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User & {
    verified: boolean;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  token?: string; // For Google OAuth auto-login
  user: {
    id?: string;
    username: string;
    email: string;
    role: string;
    verified?: boolean;
  };
}

// Venue
export interface Venue {
  _id: string;
  name: string;
  description?: string;
  phone?: string;
  address: string;
  city: string;
  state?: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  images?: string[];
  amenities?: string[];
  owner: string;
  sports: string[];
  ratings: {
    userId: string;
    rating: number;
  }[];
  averageRating: number;
  totalRatings: number;
  createdAt: string;
  updatedAt: string;
}

// SubVenue Sport
export interface SubVenueSport {
  name: string;
  minPlayers: number;
  maxPlayers: number;
}

// SubVenue
export interface SubVenue {
  _id: string;
  venue: string;
  name: string;
  description?: string;
  images?: string[];
  sports: SubVenueSport[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// Slot
export interface Slot {
  _id: string;
  startTime: string;
  endTime: string;
  prices: {
    [sportName: string]: number;
  };
  status: "available" | "booked" | "blocked";
  bookedForSport?: string | null;
  bookedBy?: { _id?: string; id?: string; username?: string; email?: string } | string | null;
  bookedAt?: string | null;
}

// TimeSlot
export interface TimeSlot {
  _id: string;
  subVenue: string;
  date: string;
  slots: Slot[];
  createdAt: string;
  updatedAt: string;
}