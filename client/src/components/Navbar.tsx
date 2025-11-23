import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home,
  MapPin,
  Users,
  Trophy,
  PackagePlus,
  UserCircle,
  LogOut,
  Menu,
  X,
  UserCog,
  CalendarSearchIcon,
} from "lucide-react";
import Logo from "../assets/SportSphereLogo.jpg";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-sidebar text-sidebar-foreground shadow-lg w-full sticky top-0 bg-black/20 backdrop-blur-md z-50">
      <div className="w-full">
        <div className="relative flex items-center justify-between h-16 px-4 w-25">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center w-auto">
            <Link to="/" className="flex items-center">
              <img
                src={Logo}
                alt="SportSphere Logo"
                className="h-10 w-25 mr-2 rounded-xl"
              />
            </Link>
          </div>

          {/* Center: Navigation (desktop) */}
          <div className="hidden md:flex items-center justify-center flex-1 px-2 space-x-4">
            <Link
              to="/"
              className="text-sidebar-primary hover:bg-white/20 hover:text-primary px-3 py-2 rounded-xl flex items-center transition-colors"
            >
              <Home className="w-5 h-5 mr-1" />
              Home
            </Link>

            <Link
              to="/venues"
              className="text-sidebar-primary hover:bg-white/20 hover:text-primary px-3 py-2 rounded-xl flex items-center transition-colors"
            >
              <MapPin className="w-5 h-5 mr-1" />
              Venues
            </Link>

            <Link
              to="/coaches"
              className="text-sidebar-primary hover:bg-white/20 hover:text-primary px-3 py-2 rounded-xl flex items-center transition-colors"
            >
              <Users className="w-5 h-5 mr-1" />
              Coaches
            </Link>

            <Link
              to="/games"
              className="text-sidebar-primary hover:bg-white/20 hover:text-primary px-3 py-2 rounded-xl flex items-center transition-colors"
            >
              <Trophy className="w-5 h-5 mr-1" />
              Games
            </Link>
          </div>

          {/* Right: User dropdown (desktop) */}
          <div className="hidden md:flex items-center flex-shrink-0">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="text-sidebar-primary hover:text-primary hover:bg-white/20 px-3 py-2 rounded-xl flex items-center transition-colors"
                >
                  <UserCircle className="w-5 h-5 mr-1" />
                  <span>{user?.username}</span>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 z-20">
                    <Link
                      to="/my-profile"
                      className=" px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <UserCircle className="w-5 h-5 mr-2" />
                      My Profile
                    </Link>

                    <Link
                      to="/my-bookings"
                      className=" px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <CalendarSearchIcon className="w-5 h-5 mr-2" />
                      My Bookings
                    </Link>

                    {/* Only show Host Game for players */}
                    {user?.role === "player" && (
                      <Link
                        to="/host-game"
                        className=" px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <PackagePlus className="w-5 h-5 mr-2" />
                        Host Game
                      </Link>
                    )}

                    {user?.role === "coach" && (
                      <Link
                        to="/coach-dashboard"
                        className=" px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UserCog className="w-5 h-5 mr-2" />
                        Coach Dashboard
                      </Link>
                    )}

                    {user?.role === "venue-owner" && (
                      <Link
                        to="/venue-dashboard"
                        className=" px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <UserCog className="w-5 h-5 mr-2" />
                        Venue Dashboard
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                    >
                      <LogOut className="w-5 h-5 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Link
                  to="/login"
                  className="block text-sidebar-primary hover:bg-white/20 hover:text-primary px-3 py-2 rounded-xl transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center ">
                    <UserCircle className="w-5 h-5 mr-1" />
                    Account
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-sidebar-primary hover:bg-sidebar-accent p-2 rounded-md transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className="block text-sidebar-primary hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center hover:text-primary">
                <Home className="w-5 h-5 mr-2" />
                Home
              </div>
            </Link>

            <Link
              to="/venues"
              className="block text-sidebar-primary hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center hover:text-primary">
                <MapPin className="w-5 h-5 mr-2" />
                Venues
              </div>
            </Link>

            <Link
              to="/coaches"
              className="block text-sidebar-primary hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center hover:text-primary">
                <Users className="w-5 h-5 mr-2" />
                Coaches
              </div>
            </Link>

            <Link
              to="/games"
              className="block text-sidebar-primary hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex items-center hover:text-primary">
                <Trophy className="w-5 h-5 mr-2" />
                Games
              </div>
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/my-bookings"
                  className="block text-sidebar-primary hover:text-primary px-3 py-2 rounded-md transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center ">
                    <CalendarSearchIcon className="w-5 h-5 mr-2" />
                    My Bookings
                  </div>
                </Link>

                {/* Only show Host Game for players */}
                {user?.role === "player" && (
                  <Link
                    to="/host-game"
                    className=" px-4 py-2 text-card-foreground hover:bg-muted flex items-center transition-colors"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <PackagePlus className="w-5 h-5 mr-2" />
                    Host Game
                  </Link>
                )}

                {user?.role === "coach" && (
                  <Link
                    to="/coach-dashboard"
                    className="block text-sidebar-primary hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center hover:text-primary">
                      <Users className="w-5 h-5 mr-2" />
                      Coach Dashboard
                    </div>
                  </Link>
                )}

                {user?.role === "venue-owner" && (
                  <Link
                    to="/venue-dashboard"
                    className="block text-sidebar-primary hover:bg-sidebar-accent px-3 py-2 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center hover:text-primary">
                      <UserCog className="w-5 h-5 mr-2" />
                      Venue Dashboard
                    </div>
                  </Link>
                )}

                {isAuthenticated && (
                  <Link
                    to="/my-profile"
                    className="block text-sidebar-primary hover:text-primary px-3 py-2 rounded-md transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <div className="flex items-center ">
                      <UserCircle className="w-5 h-5 mr-2" />
                      My Profile
                    </div>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-card-foreground hover:text-primary flex items-center transition-colors"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Logout
                </button>
              </>
            ) : (
              // Login 
              <Link
                to="/login"
                className="block text-sidebar-primary hover:text primary px-3 py-2 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center hover:text-primary">
                  <UserCircle className="w-5 h-5 mr-1" />
                  Account
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
