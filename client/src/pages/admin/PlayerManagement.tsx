import React, { useState } from "react";
import DashboardLayout from "../../admin/DashboardLayout";
import {
  Search,
  CheckCircle,
  Trash2,
  Ban,
  X,
  Eye,
  FileText,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PlayerManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [verificationModal, setVerificationModal] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [detailsModal, setDetailsModal] = useState<number | null>(null);

  // Enhanced dummy data for players with proof documents
  const [players, setPlayers] = useState([
    {
      id: 1,
      name: "Alex Thompson",
      email: "alex.thompson@email.com",
      status: "Active",
      dateJoined: "Jan 15, 2025",
      gamesPlayed: 24,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop",
      },
      sports: ["Basketball", "Tennis"],
      team: "Thunder Hawks",
      stats: { wins: 18, losses: 6, winRate: "75%" },
    },
    {
      id: 2,
      name: "Jordan Lee",
      email: "jordan.lee@email.com",
      status: "Active",
      dateJoined: "Feb 3, 2025",
      gamesPlayed: 18,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
      },
      sports: ["Soccer", "Swimming"],
      team: "Blue Waves",
      stats: { wins: 12, losses: 6, winRate: "67%" },
    },
    {
      id: 3,
      name: "Casey Martinez",
      email: "casey.martinez@email.com",
      status: "Restricted",
      dateJoined: "Mar 10, 2025",
      gamesPlayed: 12,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Casey",
      proofDocument: {
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      sports: ["Basketball"],
      team: "Fire Bolts",
      stats: { wins: 5, losses: 7, winRate: "42%" },
    },
    {
      id: 4,
      name: "Taylor Brown",
      email: "taylor.brown@email.com",
      status: "Active",
      dateJoined: "Apr 5, 2025",
      gamesPlayed: 31,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
      },
      sports: ["Tennis", "Badminton"],
      team: "Golden Eagles",
      stats: { wins: 24, losses: 7, winRate: "77%" },
    },
    {
      id: 5,
      name: "Morgan Davis",
      email: "morgan.davis@email.com",
      status: "Pending",
      dateJoined: "May 12, 2025",
      gamesPlayed: 15,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Morgan",
      proofDocument: {
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      sports: ["Soccer"],
      team: "Storm Riders",
      stats: { wins: 9, losses: 6, winRate: "60%" },
    },
    {
      id: 6,
      name: "Riley Wilson",
      email: "riley.wilson@email.com",
      status: "Restricted",
      dateJoined: "Jun 8, 2025",
      gamesPlayed: 8,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Riley",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
      },
      sports: ["Basketball", "Volleyball"],
      team: "Night Owls",
      stats: { wins: 3, losses: 5, winRate: "38%" },
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Restricted":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "Pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getPlayerById = (id: number) => {
    return players.find((p) => p.id === id);
  };

  const handleApprove = (id: number) => {
    setPlayers(
      players.map((player) =>
        player.id === id ? { ...player, status: "Active" } : player
      )
    );
    setVerificationModal(null);
  };

  const handleReject = (id: number) => {
    setPlayers(
      players.map((player) =>
        player.id === id ? { ...player, status: "Restricted" } : player
      )
    );
    setVerificationModal(null);
  };

  const handleRestrict = (id: number) => {
    setPlayers(
      players.map((player) =>
        player.id === id ? { ...player, status: "Restricted" } : player
      )
    );
  };

  const handleDelete = (id: number) => {
    setPlayers(players.filter((player) => player.id !== id));
    setDeleteModal(null);
  };

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All Status" || player.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    Active: players.filter((p) => p.status === "Active").length,
    Restricted: players.filter((p) => p.status === "Restricted").length,
    Pending: players.filter((p) => p.status === "Pending").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">
          Player Management
        </h1>

        {/* Main Panel */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-foreground mb-6">
              All Players
            </h2>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search players by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-muted border border-primary/20 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 bg-muted border border-primary/20 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all"
              >
              <option>All Status</option>
              <option>Active</option>
              <option>Restricted</option>
              <option>Pending</option>
            </select>
          </div>

            {/* Players Table */}
            <div className="overflow-x-auto rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/20 bg-muted/30">
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      User Name
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Email
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Games Played
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200"
                    >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.profilePicture}
                          alt={player.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                        />
                        <span className="text-foreground font-medium">
                          {player.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {player.email}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          player.status
                        )}`}
                      >
                        {player.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-foreground">
                      {player.gamesPlayed}
                    </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailsModal(player.id)}
                            className="p-2 bg-muted hover:bg-primary/20 text-foreground hover:text-primary rounded-xl transition-all duration-200 hover:scale-105 border border-primary/20 hover:border-primary/60"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {player.status !== "Active" && (
                            <button
                              onClick={() => setVerificationModal(player.id)}
                              className="p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 hover:scale-105 shadow-lg"
                              title="Verify"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {player.status !== "Restricted" && (
                            <button
                              onClick={() => handleRestrict(player.id)}
                              className="p-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-all duration-200 hover:scale-105 border border-amber-500/30"
                              title="Restrict"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteModal(player.id)}
                            className="p-2 bg-rose-500/20 text-rose-400 rounded-xl hover:bg-rose-500/30 transition-all duration-200 hover:scale-105 border border-rose-500/30"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Summary */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground pt-4 border-t border-primary/20">
            <p>
              Showing {filteredPlayers.length} of {players.length} players.
            </p>
            <p>
              Total: {statusCounts.Active} Active, {statusCounts.Restricted}{" "}
              Restricted, {statusCounts.Pending} Pending
            </p>
          </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <AnimatePresence>
        {verificationModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVerificationModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              >
                {(() => {
                  const player = getPlayerById(verificationModal);
                  if (!player) return null;
                  return (
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-foreground">
                          Verify Player
                        </h2>
                        <button
                          onClick={() => setVerificationModal(null)}
                          className="p-2 hover:bg-muted rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5 text-foreground" />
                        </button>
                      </div>

                      {/* Player Info */}
                      <div className="flex items-start gap-6 mb-6 pb-6 border-b border-border">
                        <img
                          src={player.profilePicture}
                          alt={player.name}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-1">
                            {player.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {player.email}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              player.status
                            )}`}
                          >
                            {player.status}
                          </span>
                        </div>
                      </div>

                      {/* Proof Document Section */}
                      <div className="mb-6">
                        <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          Proof Document
                        </h3>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          {player.proofDocument.type === "image" ? (
                            <div className="relative">
                              <img
                                src={player.proofDocument.url}
                                alt="Proof document"
                                className="w-full rounded-xl shadow-lg"
                              />
                              <a
                                href={player.proofDocument.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-4 right-4 p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ) : (
                            <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-primary/20">
                              <iframe
                                src={player.proofDocument.url}
                                className="w-full h-full"
                                title="Proof document PDF"
                              />
                              <a
                                href={player.proofDocument.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-4 right-4 p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 shadow-lg hover:scale-105"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleApprove(player.id)}
                          className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 font-bold shadow-lg hover:scale-105"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(player.id)}
                          className="flex-1 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 font-bold shadow-lg hover:scale-105"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setVerificationModal(null)}
                          className="px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-all duration-200 font-semibold border border-primary/20 hover:border-primary/60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-md w-full p-8"
              >
                {(() => {
                  const player = getPlayerById(deleteModal);
                  if (!player) return null;
                  return (
                    <>
                      <h2 className="text-2xl font-black text-foreground mb-2">
                        Delete Player
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                          {player.name}
                        </span>
                        's request? This action cannot be undone.
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setDeleteModal(null)}
                          className="flex-1 px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-all duration-200 font-semibold border border-primary/20 hover:border-primary/60"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(player.id)}
                          className="flex-1 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 font-bold shadow-lg hover:scale-105"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* View Details Modal */}
      <AnimatePresence>
        {detailsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailsModal(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                {(() => {
                  const player = getPlayerById(detailsModal);
                  if (!player) return null;
                  return (
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-foreground">
                          Player Details
                        </h2>
                        <button
                          onClick={() => setDetailsModal(null)}
                          className="p-2 hover:bg-muted rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5 text-foreground" />
                        </button>
                      </div>

                      {/* Profile Section */}
                      <div className="flex items-start gap-6 mb-6 pb-6 border-b border-border">
                        <img
                          src={player.profilePicture}
                          alt={player.name}
                          className="w-24 h-24 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-foreground mb-1">
                            {player.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {player.email}
                          </p>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                player.status
                              )}`}
                            >
                              {player.status}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Joined {player.dateJoined}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Games Played
                          </p>
                          <p className="text-2xl font-black text-foreground">
                            {player.gamesPlayed}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Win Rate
                          </p>
                          <p className="text-2xl font-black text-emerald-400">
                            {player.stats.winRate}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Wins
                          </p>
                          <p className="text-2xl font-black text-emerald-400">
                            {player.stats.wins}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Losses
                          </p>
                          <p className="text-2xl font-black text-rose-400">
                            {player.stats.losses}
                          </p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                            Sports
                          </h4>
                          <div className="flex flex-wrap gap-2">
                          {player.sports.map((sport, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm border border-primary/30 font-semibold"
                            >
                              {sport}
                            </span>
                          ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                            Team
                          </h4>
                          <p className="text-foreground font-medium">
                            {player.team}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default PlayerManagement;
