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

// Register Response
export interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    username: string;
    email: string;
    role: string;
  };
}