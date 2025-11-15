import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MapPin,
  FileText,
  LogOut,
  Ticket,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      name: "Overview",
      path: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Player Management",
      path: "/admin/players",
      icon: Users,
    },
    {
      name: "Coach Management",
      path: "/admin/coaches",
      icon: UserCheck,
    },
    {
      name: "Venue Management",
      path: "/admin/venues",
      icon: MapPin,
    },
    {
      name: "Reports",
      path: "/admin/reports",
      icon: FileText,
    },
    {
      name: "Tickets",
      path: "/admin/tickets",
      icon: Ticket,
    },
  ];

  const handleLogout = () => {
    // Clear admin flag from localStorage
    localStorage.removeItem("isAdminLoggedIn");
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-full w-64 bg-card border-r border-border flex flex-col">
      {/* Logo/Brand Section */}
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-gradient-orange">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">SportSphere</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center px-4 py-3 rounded-lg transition-all duration-200
                ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg glow-orange"
                    : "text-foreground hover:bg-muted hover:text-primary"
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 rounded-lg text-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

