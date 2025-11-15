import React from "react";
import DashboardLayout from "../../admin/DashboardLayout";
import {
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Overview = () => {
  // Dummy data for metrics
  const metrics = [
    {
      label: "Total Revenue",
      value: "$1,234",
      icon: DollarSign,
      color: "text-primary",
    },
    {
      label: "New Users (30 Days)",
      value: "150",
      icon: Users,
      color: "text-primary",
    },
    {
      label: "Active Bookings",
      value: "32",
      icon: Calendar,
      color: "text-primary",
    },
    {
      label: "Pending Verifications",
      value: "5",
      icon: AlertCircle,
      color: "text-primary",
      highlight: true,
    },
  ];

  // Dummy data for user signups chart
  const signupData = [
    { date: "Nov 1", signups: 12 },
    { date: "Nov 5", signups: 19 },
    { date: "Nov 10", signups: 15 },
    { date: "Nov 15", signups: 22 },
    { date: "Nov 20", signups: 18 },
    { date: "Nov 25", signups: 28 },
    { date: "Nov 30", signups: 24 },
  ];

  // Dummy data for revenue by venue chart
  const revenueData = [
    { venue: "Arena A", revenue: 580 },
    { venue: "Arena B", revenue: 420 },
    { venue: "Court C", revenue: 350 },
    { venue: "Field D", revenue: 280 },
    { venue: "Park E", revenue: 200 },
  ];

  // Dummy data for pending verifications table
  const pendingVerifications = [
    {
      id: 1,
      userName: "John Smith",
      userType: "Coach",
      dateRegistered: "Oct 28, 2025",
    },
    {
      id: 2,
      userName: "Sarah Johnson",
      userType: "Venue Owner",
      dateRegistered: "Oct 29, 2025",
    },
    {
      id: 3,
      userName: "Mike Davis",
      userType: "Coach",
      dateRegistered: "Nov 1, 2025",
    },
    {
      id: 4,
      userName: "Emma Wilson",
      userType: "Venue Owner",
      dateRegistered: "Nov 2, 2025",
    },
  ];

  const handleVerify = (id) => {
    console.log("Verify user:", id);
    // TODO: Implement verify functionality
  };

  const handleReject = (id) => {
    console.log("Reject user:", id);
    // TODO: Implement reject functionality
  };

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
              <div
                key={index}
                className={`
                  group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30
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
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Signups Chart */}
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-black text-foreground mb-4">
                User Signups (Last 30 Days)
              </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={signupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Venue Chart */}
          <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10">
              <h2 className="text-xl font-black text-foreground mb-4">
                Revenue by Venue
              </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="venue"
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pending Verifications Table */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-black text-foreground mb-6">
              Pending Verifications
            </h2>
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/20 bg-muted/30">
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      User Name
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      User Type
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Date Registered
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVerifications.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200"
                    >
                      <td className="py-4 px-4 text-foreground font-medium">{user.userName}</td>
                      <td className="py-4 px-4 text-foreground">{user.userType}</td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {user.dateRegistered}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVerify(user.id)}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 text-sm font-bold shadow-lg hover:scale-105"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 text-sm font-bold shadow-lg hover:scale-105"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Overview;

