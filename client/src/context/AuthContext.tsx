// import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// import { apiLogin, apiRegister } from '../services/api';
// import { User, AuthResponse } from "../types/index";

// // Defines the shape of the data and functions that the AuthContext will provide.
// // This serves as a contract for any component consuming this context.
// interface AuthContextType {
//   isAuthenticated: boolean;
//   isLoading: boolean;
//   login: (email: string, password: string) => Promise<void>;
//   register: (username: string, email: string, password: string) => Promise<void>;
//   logout: () => void;
//   refreshAuth: () => Promise<void>;
//   success: string | null;
//   setSuccess: (msg: string | null) => void;
// }

// // Defines the props for the AuthProvider component, ensuring it can wrap other components.
// interface AuthProviderProps {
//     children: ReactNode;
// }

// // Creates the React Context object. It is initialized with `undefined` and will be given
// // its value by the AuthProvider component.
// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// // The AuthProvider is a component that encapsulates all authentication-related state and logic.
// // It will wrap the entire application, making the auth state globally available.
// export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
//   // State to hold the authenticated user object. Null if no user is logged in.
//   const [user, setUser] = useState<User | null>(null);
//   // State to track the initial loading process while checking for a persisted session.
//   const [isLoading, setIsLoading] = useState(true);
//   const [success, setSuccess] = useState<string | null>(null);

//   const fetchCurrentUser = async (token: string) => {
//     try {
//       const response = await fetch('http://localhost:8000/api/auth/me', {
//         method: 'GET',
//         credentials: 'include',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`,
//         },
//       });

//       if (!response.ok) {
//         setUser(null);
//         return;
//       }

//       const data = await response.json();
//       setUser(data.user || null);

//     } catch (error) {
//       console.warn("fetchCurrentUser failed:", error);
//       setUser(null);
//       return;
//     }
//   };

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       setIsLoading(false);
//       return;
//     }

//     (async () => {
//       await fetchCurrentUser(token);
//       setIsLoading(false);
//     })();
//   }, []);

//   // Handles the login process by calling the API service and updating the state on success.
//   const login = async (email: string, password: string) => {
//     const data: AuthResponse = await apiLogin(email, password);
//     // Persist the session in localStorage.
//     localStorage.setItem('token', data.token);
//     // Update the user state, which will trigger a rerender throughout the application.
//     setUser(data.user);
//   };

//   // Handles the user registration process by calling the API service.
//   // It does not automatically log the user in upon successful registration.
//   const register = async (username: string, email: string, password: string) => {
//      try {
//       const data = await apiRegister(username, email, password);

//       // No data 
//       if (!data) {
//         throw new Error('Registration failed');
//       }
     
//     } catch (error) { // Unwanted Error
//       console.error('Registration error:', error);
//       throw error;
//     }
//   };

//   // Clears the user's session from both the application state and localStorage.
//   const logout = () => {
//     localStorage.removeItem('token');
//     setUser(null);
//   };

//   // const refreshAuth = async () => {
//   //   const token = localStorage.getItem('token');
//   //   if (!token) return;
//   //   setIsLoading(true);
//   //   await fetchCurrentUser(token);
//   //   setIsLoading(false);
//   // };

//   // Assemble the context value object that will be exposed to consuming components.
//   const value = {
//     isAuthenticated: !!user, // `!!` converts the user object or null into a strict boolean.
//     user,
//     isLoading,
//     login,
//     register,
//     logout,
//     refreshAuth,
//     success,
//     setSuccess,
//   };

//   // The Provider component makes the `value` object available to any child component
//   // that is rendered within it.
//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// };

// // A custom hook that simplifies the process of consuming the AuthContext.
// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   // If a component tries to use this hook outside of the AuthProvider's scope,
//   // this check will throw an error, which makes debugging easier.
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiLogin } from '../services/api';
import { User, AuthResponse } from "../types/index";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
    children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser) {
          setUser(parsedUser);
        }
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.error('Error restoring auth state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login 
  const login = async (email: string, password: string) => {
    try {
      const data: AuthResponse = await apiLogin(email, password);
      if (!data.token || !data.user) {
        throw new Error('Invalid response from server');
      }
      // Store token and user in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    }
  };

  // Logout 
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Context value
  const value = {
    isAuthenticated: !!user,
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>; // Provide context to children
};

// Custom hook to access auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};