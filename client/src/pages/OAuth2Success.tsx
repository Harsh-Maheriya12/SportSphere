import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const hasProcessed = useRef(false);

  // API URL
  const BASE_URL = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : "/api";

  useEffect(() => {
    // Prevent double execution in React.StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    const name = params.get("name");
    const picture = params.get("picture");
    const provider = params.get("provider");

    console.log("OAuth Success - Params:", {
      token: !!token,
      email,
      name,
      picture,
      provider,
    });

    // Case 1: Existing user login (has token)
    if (token) {
      console.log("Existing user - logging in with token");
      localStorage.setItem("token", token);

      // Fetch user data
      fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
          }
          refreshAuth(); // Update auth context immediately
          navigate("/", { replace: true });
        })
        .catch(() => {
          refreshAuth(); // Update auth context even on error
          navigate("/", { replace: true });
        });

      return;
    }

    // Case 2: New user from Google OAuth (has email, no token)
    if (email) {
      console.log("New user - redirecting to registration with email:", email);
      // Store Google OAuth data temporarily for registration
      const googleData = {
        email: decodeURIComponent(email),
        name: name ? decodeURIComponent(name) : "",
        picture: picture ? decodeURIComponent(picture) : "",
        provider: provider || "google",
        verified: true,
      };

      console.log("Storing Google data:", googleData);
      sessionStorage.setItem("googleOAuthData", JSON.stringify(googleData));

      // Redirect to registration page (will skip email/OTP steps)
      navigate("/register?oauth=google", { replace: true });
      return;
    }

    // Case 3: Error - no valid params
    console.error("OAuth Error - no valid params found");
    navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthSuccess;
