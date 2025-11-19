import React from "react";
import { NavLink } from "react-router-dom";

function CoachDashboardNav() {
  return (
    <div className="flex flex-wrap gap-2 m-2 mb-4">
      {/*Profile*/}
      <NavLink
        to="/coach-dashboard/profile"
        className={({ isActive }) =>
          `px-5 py-2 rounded-xl border transition-colors font-medium ${
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card hover:bg-accent/10"
          }`
        }
      >
        Profile
      </NavLink>

      {/*Time Slots*/}
      <NavLink
        to="/coach-dashboard/slots"
        className={({ isActive }) =>
          `px-5 py-2 rounded-xl border transition-colors font-medium ${
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card hover:bg-accent/10"
          }`
        }
      >
       Manage Slots
      </NavLink>

      {/*Booking Requests*/}
      <NavLink
        to="/coach-dashboard/bookings"
        className={({ isActive }) =>
          `px-5 py-2 rounded-xl border transition-colors font-medium ${
            isActive
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card hover:bg-accent/10"
          }`
        }
      >
        Booking Requests
      </NavLink>
    </div>
  );
}

export default CoachDashboardNav;
