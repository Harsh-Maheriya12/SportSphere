import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MapPin,
  Ticket,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type MenuItem = {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems: MenuItem[] = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "User Management", path: "/admin/users", icon: Users },
    { name: "Coach Management", path: "/admin/coaches", icon: UserCheck },
    { name: "Venue Management", path: "/admin/venue-owners", icon: MapPin },
    { name: "Ticket Management", path: "/admin/tickets", icon: Ticket },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("isAdminLoggedIn");
    } catch (e) {}
    navigate("/admin/login");
  };

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-full w-64 bg-card border-r border-border flex flex-col">

      {/* Prevent overlap with navbar */}
      <div className="pt-20"></div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                active
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-muted hover:text-primary"
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
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
