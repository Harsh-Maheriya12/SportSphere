import React, { useEffect, useState } from "react";
import DashboardLayout from "../../admin/DashboardLayout";
import {
  Users,
  MapPin,
  UserCheck,
  Ticket,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getOverviewStats, fetchTickets } from '../../services/adminApi';

const Overview: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVenueOwners: 0,
    totalCoaches: 0,
    pendingTickets: 0,
  });
  const [loading, setLoading] = useState(true);

  // Get admin token from localStorage
  const getAdminToken = () => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
  };

  // Load overview stats
  const loadStats = async () => {
    try {
      setLoading(true);
      const adminToken = getAdminToken();
      const res = await getOverviewStats(adminToken);
      if (res.success && res.data) {
        setStats({
          totalUsers: res.data.totalUsers || 0,
          totalVenueOwners: res.data.totalVenueOwners || 0,
          totalCoaches: res.data.totalCoaches || 0,
          pendingTickets: res.data.pendingTickets || 0,
        });
      }
    } catch (err) {
      console.error('loadStats error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Metrics configuration with navigation paths
  const metrics = [
    {
      label: "Total Users",
      value: loading ? "..." : stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "text-primary",
      path: "/admin/users",
    },
    {
      label: "Total Venue Owners",
      value: loading ? "..." : stats.totalVenueOwners.toLocaleString(),
      icon: MapPin,
      color: "text-primary",
      path: "/admin/venue-owners",
    },
    {
      label: "Total Coaches",
      value: loading ? "..." : stats.totalCoaches.toLocaleString(),
      icon: UserCheck,
      color: "text-primary",
      path: "/admin/coaches",
    },
    {
      label: "Pending Tickets",
      value: loading ? "..." : stats.pendingTickets.toLocaleString(),
      icon: Ticket,
      color: "text-primary",
      highlight: true,
      path: "/admin/tickets",
    },
  ];

  // Fetch recent tickets
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  const loadRecentTickets = async () => {
    try {
      const adminToken = getAdminToken();
      const data = await fetchTickets(adminToken);
      // Get first 5 most recent tickets
      const tickets = (data.tickets || []).slice(0, 5).map((t: any) => ({
        id: t._id, // Use _id for navigation
        ticketId: t.ticketId || t._id,
        subject: t.subject,
        status: t.status,
        user: t.userEmail || t.userName || 'Unknown',
        updated: new Date(t.updatedAt || t.createdAt || Date.now()).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      }));
      setRecentTickets(tickets);
    } catch (err: any) {
      console.error('loadRecentTickets error', err);
      // Silently fail for recent tickets - don't show error toast as it's not critical
    }
  };

  useEffect(() => {
    loadRecentTickets();
  }, []);

  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">
          Overview
        </h1>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(metric.path)}
                className={`
                  group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30 cursor-pointer text-left
                  ${metric.highlight ? "border-primary/60 glow-orange" : ""}
                `}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`w-5 h-5 text-primary`} />
                    </div>
                  </div>
                  <p className="text-3xl font-black text-foreground">
                    {metric.value}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Panels (Recent Tickets + Quick Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-black text-foreground mb-4">Recent Tickets</h2>
              <div className="space-y-3">
                {recentTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => navigate(`/admin/tickets?ticketId=${t.id}`)}
                    className="w-full flex items-center justify-between p-3 bg-card rounded-lg border hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{t.subject}</div>
                      <div className="text-sm text-muted-foreground">{t.user} • {t.updated}</div>
                    </div>
                    <div className="text-sm ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        t.status === 'Open' 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : t.status === 'Replied' 
                          ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' 
                          : t.status === 'Closed'
                          ? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}>{t.status}</span>
                    </div>
                  </button>
                ))}
              </div>
              {recentTickets.length === 0 ? (
                <div className="p-4 bg-muted rounded-xl border border-border text-center">
                  <p className="text-sm text-muted-foreground">No tickets found.</p>
                </div>
              ) : null}
              <div className="mt-4">
                <button onClick={() => navigate('/admin/tickets')} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">View all tickets</button>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-black text-foreground mb-4">Quick Actions</h2>
              <div className="flex flex-col gap-3">
                <button onClick={() => navigate('/admin/users')} className="w-full text-left px-4 py-3 bg-muted rounded-xl hover:bg-primary/10">Manage users</button>
                <button onClick={() => navigate('/admin/coaches')} className="w-full text-left px-4 py-3 bg-muted rounded-xl hover:bg-primary/10">Manage coaches</button>
                <button onClick={() => navigate('/admin/venue-owners')} className="w-full text-left px-4 py-3 bg-muted rounded-xl hover:bg-primary/10">Manage venue owners</button>
                <button onClick={() => navigate('/admin/tickets')} className="w-full text-left px-4 py-3 bg-muted rounded-xl hover:bg-primary/10">Manage tickets</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;