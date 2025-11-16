export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

// This is the expected shape of the response from the login/register API endpoints.
export interface AuthResponse {
    message: string;
    token: string;
    user: User;
}

// Register response type
export interface RegisterResponse {
    message: string;
    success: boolean;
    user: {
        username: string;
        email: string;
    };
}

// Venue related types
export interface Venue {
    _id: string;
    name: string;
    description?: string;
    address: string;
    city?: string;
    sports: string[];
    images?: string[];
    pricePerHour: number;
    amenities?: string[];
    timeSlots?: string[];
}
