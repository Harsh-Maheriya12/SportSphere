import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const OAuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Persist token only. Do not call any global auth fetch or setSuccess here.
    localStorage.setItem("token", token);

    // Immediately redirect to the app; AuthContext will handle fetching the user.
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return null;
};

export default OAuthSuccess;