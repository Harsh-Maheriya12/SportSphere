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