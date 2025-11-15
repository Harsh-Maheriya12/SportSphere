import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { Bell, Search, UserCircle, Menu, X } from "lucide-react";

const DashboardLayout = ({ children }) => {
  const { user } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed left-0 top-0 h-screen z-50 transform transition-transform duration-300
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col w-full">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
          <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 text-foreground hover:bg-muted rounded-lg transition-colors mr-2"
            >
              {isMobileSidebarOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 lg:space-x-4 ml-2 lg:ml-6">
              {/* Notifications */}
              <button className="relative p-2 text-foreground hover:bg-muted rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </button>

              {/* User Profile */}
              <div className="flex items-center space-x-2 lg:space-x-3 px-2 lg:px-3 py-2 bg-muted rounded-lg">
                <UserCircle className="w-5 h-5 lg:w-6 lg:h-6 text-primary" />
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-foreground">
                    {user?.username || "Admin"}
                  </p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

