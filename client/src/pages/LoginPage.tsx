import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import GoogleLogo from "../assets/google.svg";

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // API URL
  const BASE_URL = import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : "/api";

  // Check for error in URL params
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorMsg = params.get("error");
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      // Clean up the URL
      navigate("/login", { replace: true });
    }
  }, [location, navigate]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/"); // Redirect to home page after login
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/10 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">SportSphere</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Welcome back!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please enter your details to sign in
          </p>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-lg">
          {/* Error*/}
          {error && (
            <div className="mb-6 p-4 bg-destructive/20 border-l-4 border-destructive text-foreground rounded-lg flex items-center space-x-2">
              <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Email */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-md font-medium text-foreground mb-1"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground hover:border-primary hover:border-2 border-2 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm text-primary/70 hover:text-primary font-medium transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground hover:border-primary hover:border-2 border-2 transition-colors"
                  placeholder="••••••••"
                />
                {/* Show/Hide password button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-xl text-primary-foreground bg-primary
                   hover:border-white/90 hover:border-2 box-border border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors 
                   ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-foreground" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>
            {/* Google Sign-In */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);

                  window.location.href =
                    `${BASE_URL}/auth/google`;
                }}
                disabled={isLoading}
                className={`group relative w-full flex items-center justify-center py-3 px-4 border-transparent text-sm font-medium rounded-xl bg-black text-primary
                   hover:border-white/90 hover:border-2 box-border border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors mt-3
                   ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
                aria-label="Sign in with Google"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-foreground" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <img
                      src={GoogleLogo}
                      alt="Google"
                      className="h-5 w-5 mr-3"
                    />
                    <span className="text-primary">Sign in with Google</span>
                  </>
                )}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  New to SportSphere?
                </span>
              </div>
            </div>

            {/* Register */}
            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex items-center justify-center px-4 py-2  rounded-xl shadow-sm text-sm font-medium text-muted-foreground bg-card hover:text-primary hover:underline transition-colors"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
