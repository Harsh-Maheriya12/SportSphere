import React from "react";
import { NavLink } from "react-router-dom";
import { Building2, MapPin, Clock, ChevronRight } from "lucide-react";

function VenueDashboardNav() {
  const navItems = [
    {
      to: "/venue-dashboard/venues",
      icon: Building2,
      label: "My Venues",
      description: "Manage facilities"
    },
    {
      to: "/venue-dashboard/subvenues",
      icon: MapPin,
      label: "Courts/Fields",
      description: "Playing areas"
    },
    {
      to: "/venue-dashboard/slots",
      icon: Clock,
      label: "Time Slots",
      description: "Schedule bookings"
    }
  ];

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-card/60 to-primary/5 backdrop-blur-md rounded-2xl border-2 border-primary/20 p-2 mb-8 shadow-lg">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -ml-12 -mb-12"></div>
      
      <nav className="relative flex flex-wrap gap-3 justify-center md:justify-start">
        {navItems.map(({ to, icon: Icon, label, description }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 overflow-hidden ${
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg scale-105"
                  : "text-foreground hover:bg-primary/10 hover:scale-105 hover:shadow-md"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Animated background for active state */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse"></div>
                )}
                
                {/* Icon with background */}
                <div className={`relative z-10 p-2 rounded-lg transition-all ${
                  isActive 
                    ? "bg-white/20" 
                    : "bg-primary/10 group-hover:bg-primary/20"
                }`}>
                  <Icon 
                    size={22} 
                    className={`transition-transform ${
                      isActive ? "scale-110" : "group-hover:scale-110"
                    }`}
                  />
                </div>
                
                {/* Text content */}
                <div className="relative z-10 flex flex-col">
                  <span className="font-bold text-base leading-tight">
                    {label}
                  </span>
                  <span className={`text-xs transition-opacity ${
                    isActive 
                      ? "text-white/80" 
                      : "text-muted-foreground group-hover:text-foreground"
                  }`}>
                    {description}
                  </span>
                </div>
                
                {/* Arrow indicator for active */}
                {isActive && (
                  <ChevronRight 
                    size={18} 
                    className="relative z-10 ml-auto animate-pulse" 
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default VenueDashboardNav;
