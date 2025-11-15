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
  Award,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CoachManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [verificationModal, setVerificationModal] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [detailsModal, setDetailsModal] = useState<number | null>(null);

  // Enhanced dummy data for coaches with proof documents
  const [coaches, setCoaches] = useState([
    {
      id: 1,
      name: "Michael Johnson",
      email: "michael.johnson@email.com",
      status: "Verified",
      specialty: "Basketball",
      dateRegistered: "Jan 10, 2025",
      rating: 4.8,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop",
      },
      experience: "10 years",
      students: 45,
      certifications: ["NBA Certified", "Level 3 Coach"],
      bio: "Professional basketball coach with extensive experience in training athletes at all levels.",
    },
    {
      id: 2,
      name: "Sarah Williams",
      email: "sarah.williams@email.com",
      status: "Verified",
      specialty: "Tennis",
      dateRegistered: "Feb 5, 2025",
      rating: 4.9,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
      },
      experience: "8 years",
      students: 32,
      certifications: ["ITF Certified", "USPTA Professional"],
      bio: "Former professional tennis player turned coach, specializing in technique and strategy.",
    },
    {
      id: 3,
      name: "David Chen",
      email: "david.chen@email.com",
      status: "Pending",
      specialty: "Soccer",
      dateRegistered: "Mar 20, 2025",
      rating: 0,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      proofDocument: {
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      experience: "5 years",
      students: 0,
      certifications: ["FIFA Licensed"],
      bio: "Soccer coach with a passion for developing young talent and team dynamics.",
    },
    {
      id: 4,
      name: "Emily Rodriguez",
      email: "emily.rodriguez@email.com",
      status: "Verified",
      specialty: "Swimming",
      dateRegistered: "Apr 12, 2025",
      rating: 4.7,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
      },
      experience: "12 years",
      students: 58,
      certifications: ["USAS Certified", "Water Safety Instructor"],
      bio: "Olympic-level swimming coach with expertise in competitive swimming techniques.",
    },
    {
      id: 5,
      name: "James Anderson",
      email: "james.anderson@email.com",
      status: "Restricted",
      specialty: "Football",
      dateRegistered: "May 8, 2025",
      rating: 3.2,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=James",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
      },
      experience: "6 years",
      students: 18,
      certifications: ["NFL Certified"],
      bio: "Football coach specializing in offensive strategies and player development.",
    },
    {
      id: 6,
      name: "Lisa Thompson",
      email: "lisa.thompson@email.com",
      status: "Verified",
      specialty: "Yoga",
      dateRegistered: "Jun 15, 2025",
      rating: 4.9,
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
      proofDocument: {
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      experience: "15 years",
      students: 72,
      certifications: ["RYT 500", "Yoga Alliance Certified"],
      bio: "Experienced yoga instructor focusing on mindfulness, flexibility, and strength building.",
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Restricted":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "Pending":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCoachById = (id: number) => {
    return coaches.find((coach) => coach.id === id);
  };

  const handleApprove = (id: number) => {
    setCoaches(
      coaches.map((coach) =>
        coach.id === id ? { ...coach, status: "Verified" } : coach
      )
    );
    setVerificationModal(null);
  };

  const handleReject = (id: number) => {
    setCoaches(
      coaches.map((coach) =>
        coach.id === id ? { ...coach, status: "Restricted" } : coach
      )
    );
    setVerificationModal(null);
  };

  const handleRestrict = (id: number) => {
    setCoaches(
      coaches.map((coach) =>
        coach.id === id ? { ...coach, status: "Restricted" } : coach
      )
    );
  };

  const handleDelete = (id: number) => {
    setCoaches(coaches.filter((coach) => coach.id !== id));
    setDeleteModal(null);
  };

  const filteredCoaches = coaches.filter((coach) => {
    const matchesSearch =
      coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All Status" || coach.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    Verified: coaches.filter((c) => c.status === "Verified").length,
    Restricted: coaches.filter((c) => c.status === "Restricted").length,
    Pending: coaches.filter((c) => c.status === "Pending").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">
          Coach Management
        </h1>

        {/* Main Panel */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-foreground mb-6">
              All Coaches
            </h2>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search coaches by name or email..."
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
              <option>Verified</option>
              <option>Restricted</option>
              <option>Pending</option>
            </select>
          </div>

            {/* Coaches Table */}
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
                      Specialty
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Rating
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoaches.map((coach) => (
                    <tr
                      key={coach.id}
                      className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200"
                    >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={coach.profilePicture}
                          alt={coach.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                        />
                        <span className="text-foreground font-medium">
                          {coach.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {coach.email}
                    </td>
                    <td className="py-4 px-4 text-foreground">
                      {coach.specialty}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          coach.status
                        )}`}
                      >
                        {coach.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-foreground">
                      {coach.rating > 0 ? (
                        <span className="text-primary font-semibold">
                          {coach.rating.toFixed(1)} ⭐
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailsModal(coach.id)}
                            className="p-2 bg-muted hover:bg-primary/20 text-foreground hover:text-primary rounded-xl transition-all duration-200 hover:scale-105 border border-primary/20 hover:border-primary/60"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {coach.status !== "Verified" && (
                            <button
                              onClick={() => setVerificationModal(coach.id)}
                              className="p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 hover:scale-105 shadow-lg"
                              title="Verify"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {coach.status !== "Restricted" && (
                            <button
                              onClick={() => handleRestrict(coach.id)}
                              className="p-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-all duration-200 hover:scale-105 border border-amber-500/30"
                              title="Restrict"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteModal(coach.id)}
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
              Showing {filteredCoaches.length} of {coaches.length} coaches.
            </p>
            <p>
              Total: {statusCounts.Verified} Verified, {statusCounts.Restricted}{" "}
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
                  const coach = getCoachById(verificationModal);
                  if (!coach) return null;
                  return (
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-foreground">
                          Verify Coach
                        </h2>
                        <button
                          onClick={() => setVerificationModal(null)}
                          className="p-2 hover:bg-muted rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5 text-foreground" />
                        </button>
                      </div>

                      {/* Coach Info */}
                      <div className="flex items-start gap-6 mb-6 pb-6 border-b border-border">
                        <img
                          src={coach.profilePicture}
                          alt={coach.name}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-foreground mb-1">
                            {coach.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {coach.email}
                          </p>
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                coach.status
                              )}`}
                            >
                              {coach.status}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {coach.specialty}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Proof Document Section */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Proof Document
                        </h3>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          {coach.proofDocument.type === "image" ? (
                            <div className="relative">
                              <img
                                src={coach.proofDocument.url}
                                alt="Proof document"
                                className="w-full rounded-xl shadow-lg"
                              />
                              <a
                                href={coach.proofDocument.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-4 right-4 p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-colors shadow-lg"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ) : (
                            <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-border">
                              <iframe
                                src={coach.proofDocument.url}
                                className="w-full h-full"
                                title="Proof document PDF"
                              />
                              <a
                                href={coach.proofDocument.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-4 right-4 p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-colors shadow-lg"
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
                          onClick={() => handleApprove(coach.id)}
                          className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 font-bold shadow-lg hover:scale-105"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(coach.id)}
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
                  const coach = getCoachById(deleteModal);
                  if (!coach) return null;
                  return (
                    <>
                      <h2 className="text-2xl font-black text-foreground mb-2">
                        Delete Coach
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                          {coach.name}
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
                          onClick={() => handleDelete(coach.id)}
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
                  const coach = getCoachById(detailsModal);
                  if (!coach) return null;
                  return (
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-foreground">
                          Coach Details
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
                          src={coach.profilePicture}
                          alt={coach.name}
                          className="w-24 h-24 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-foreground mb-1">
                            {coach.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {coach.email}
                          </p>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                coach.status
                              )}`}
                            >
                              {coach.status}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Registered {coach.dateRegistered}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            Specialty
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {coach.specialty}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Rating
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {coach.rating > 0
                              ? `${coach.rating.toFixed(1)} ⭐`
                              : "N/A"}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Experience
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {coach.experience}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Students
                          </p>
                          <p className="text-lg font-bold text-emerald-400">
                            {coach.students}
                          </p>
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                          Bio
                        </h4>
                        <p className="text-foreground">{coach.bio}</p>
                      </div>

                      {/* Certifications */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                          Certifications
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {coach.certifications.map((cert, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm border border-primary/30"
                            >
                              {cert}
                            </span>
                          ))}
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

export default CoachManagement;
