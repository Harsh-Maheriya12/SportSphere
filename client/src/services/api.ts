import { AuthResponse } from "../types/index";

// DEFINE THE BASE URL for all API requests. This prevents repeating it everywhere.
const BASE_URL = '/api';

// It centralizes header management, error handling, and JSON parsing.
const request = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  // Get the auth token from localStorage if it exists.
  const token = localStorage.getItem('token');

  // Set default headers.
  const headers: Record<string, string>= {
    'Content-Type': 'application/json',
  };

  // If a token exists, add the Authorization header for protected routes.
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });
  const data = await response.json();

  // If the response is not successful, throw an error with the server's message.
  let errorMessage = 'An API error occurred';
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors[0].message || data.errors[0].msg;
    } else if (data.message) {
        errorMessage = data.message;
    }
    throw new Error(errorMessage);

  return data;
};


// These functions use the generic 'request' to perform specific API calls.

export const apiLogin = (email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
};

export const apiRegister = (username: string, email: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
};
