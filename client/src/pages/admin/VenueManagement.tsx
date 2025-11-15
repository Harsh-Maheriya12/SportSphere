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
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const VenueManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [verificationModal, setVerificationModal] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<number | null>(null);
  const [detailsModal, setDetailsModal] = useState<number | null>(null);

  // Enhanced dummy data for venue owners with proof documents
  const [venueOwners, setVenueOwners] = useState([
    {
      id: 1,
      name: "John Smith",
      email: "john.smith@email.com",
      status: "Verified",
      dateRegistered: "Jan 5, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop",
      },
      venueName: "Arena A",
      venueLocation: "123 Sports Street, City",
      venueType: "Indoor Arena",
      capacity: 500,
      sports: ["Basketball", "Volleyball"],
    },
    {
      id: 2,
      name: "Lisa Anderson",
      email: "lisa.anderson@email.com",
      status: "Verified",
      dateRegistered: "Feb 12, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
      },
      venueName: "Arena B",
      venueLocation: "456 Athletic Ave, City",
      venueType: "Outdoor Field",
      capacity: 300,
      sports: ["Soccer", "Football"],
    },
    {
      id: 3,
      name: "Robert Taylor",
      email: "robert.taylor@email.com",
      status: "Pending",
      dateRegistered: "Mar 18, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert",
      proofDocument: {
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      venueName: "Court C",
      venueLocation: "789 Court Road, City",
      venueType: "Tennis Court",
      capacity: 50,
      sports: ["Tennis", "Badminton"],
    },
    {
      id: 4,
      name: "Patricia Wilson",
      email: "patricia.wilson@email.com",
      status: "Verified",
      dateRegistered: "Apr 22, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop",
      },
      venueName: "Field D",
      venueLocation: "321 Field Lane, City",
      venueType: "Soccer Field",
      capacity: 200,
      sports: ["Soccer"],
    },
    {
      id: 5,
      name: "Daniel Martinez",
      email: "daniel.martinez@email.com",
      status: "Pending",
      dateRegistered: "May 30, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel",
      proofDocument: {
        type: "pdf",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      },
      venueName: "Park E",
      venueLocation: "654 Park Boulevard, City",
      venueType: "Multi-Sport Park",
      capacity: 150,
      sports: ["Basketball", "Tennis", "Soccer"],
    },
    {
      id: 6,
      name: "Christopher Lee",
      email: "christopher.lee@email.com",
      status: "Verified",
      dateRegistered: "Jun 8, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Christopher",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop",
      },
      venueName: "Swim Center",
      venueLocation: "987 Pool Street, City",
      venueType: "Swimming Pool",
      capacity: 100,
      sports: ["Swimming"],
    },
    {
      id: 7,
      name: "Amanda Brown",
      email: "amanda.brown@email.com",
      status: "Restricted",
      dateRegistered: "Jul 15, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
      },
      venueName: "Gym Zone",
      venueLocation: "147 Fitness Way, City",
      venueType: "Gymnasium",
      capacity: 75,
      sports: ["Basketball", "Volleyball"],
    },
    {
      id: 8,
      name: "Michelle Davis",
      email: "michelle.davis@email.com",
      status: "Verified",
      dateRegistered: "Aug 20, 2025",
      profilePicture: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michelle",
      proofDocument: {
        type: "image",
        url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop",
      },
      venueName: "Track Field",
      venueLocation: "258 Running Road, City",
      venueType: "Athletic Track",
      capacity: 400,
      sports: ["Track & Field", "Soccer"],
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

  const getVenueOwnerById = (id: number) => {
    return venueOwners.find((owner) => owner.id === id);
  };

  const handleApprove = (id: number) => {
    setVenueOwners(
      venueOwners.map((owner) =>
        owner.id === id ? { ...owner, status: "Verified" } : owner
      )
    );
    setVerificationModal(null);
  };

  const handleReject = (id: number) => {
    setVenueOwners(
      venueOwners.map((owner) =>
        owner.id === id ? { ...owner, status: "Restricted" } : owner
      )
    );
    setVerificationModal(null);
  };

  const handleRestrict = (id: number) => {
    setVenueOwners(
      venueOwners.map((owner) =>
        owner.id === id ? { ...owner, status: "Restricted" } : owner
      )
    );
  };

  const handleDelete = (id: number) => {
    setVenueOwners(venueOwners.filter((owner) => owner.id !== id));
    setDeleteModal(null);
  };

  const filteredVenueOwners = venueOwners.filter((owner) => {
    const matchesSearch =
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All Status" || owner.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    Verified: venueOwners.filter((v) => v.status === "Verified").length,
    Restricted: venueOwners.filter((v) => v.status === "Restricted").length,
    Pending: venueOwners.filter((v) => v.status === "Pending").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">
          Venue Management
        </h1>

        {/* Main Panel */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-foreground mb-6">
              All Venue Owners
            </h2>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search venues by name or email..."
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

            {/* Venue Owners Table */}
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenueOwners.map((owner) => (
                    <tr
                      key={owner.id}
                      className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200"
                    >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={owner.profilePicture}
                          alt={owner.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary/30"
                        />
                        <span className="text-foreground font-medium">
                          {owner.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {owner.email}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          owner.status
                        )}`}
                      >
                        {owner.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailsModal(owner.id)}
                          className="p-2 bg-muted hover:bg-primary/20 text-foreground hover:text-primary rounded-xl transition-all duration-200 hover:scale-105 border border-primary/20 hover:border-primary/60"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {owner.status !== "Verified" && (
                          <button
                            onClick={() => setVerificationModal(owner.id)}
                            className="p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 hover:scale-105 shadow-lg"
                            title="Verify"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {owner.status !== "Restricted" && (
                          <button
                            onClick={() => handleRestrict(owner.id)}
                            className="p-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition-all duration-200 hover:scale-105 border border-amber-500/30"
                            title="Restrict"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModal(owner.id)}
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
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground pt-4 border-t border-border">
            <p>
              Showing {filteredVenueOwners.length} of {venueOwners.length} venue
              owners.
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
                  const owner = getVenueOwnerById(verificationModal);
                  if (!owner) return null;
                  return (
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-foreground">
                          Verify Venue Owner
                        </h2>
                        <button
                          onClick={() => setVerificationModal(null)}
                          className="p-2 hover:bg-muted rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5 text-foreground" />
                        </button>
                      </div>

                      {/* Owner Info */}
                      <div className="flex items-start gap-6 mb-6 pb-6 border-b border-border">
                        <img
                          src={owner.profilePicture}
                          alt={owner.name}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-foreground mb-1">
                            {owner.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {owner.email}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              owner.status
                            )}`}
                          >
                            {owner.status}
                          </span>
                        </div>
                      </div>

                      {/* Proof Document Section */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Proof Document
                        </h3>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          {owner.proofDocument.type === "image" ? (
                            <div className="relative">
                              <img
                                src={owner.proofDocument.url}
                                alt="Proof document"
                                className="w-full rounded-xl shadow-lg"
                              />
                              <a
                                href={owner.proofDocument.url}
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
                                src={owner.proofDocument.url}
                                className="w-full h-full"
                                title="Proof document PDF"
                              />
                              <a
                                href={owner.proofDocument.url}
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
                          onClick={() => handleApprove(owner.id)}
                          className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 font-bold shadow-lg hover:scale-105"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(owner.id)}
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
                  const owner = getVenueOwnerById(deleteModal);
                  if (!owner) return null;
                  return (
                    <>
                      <h2 className="text-2xl font-black text-foreground mb-2">
                        Delete Venue Owner
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold text-foreground">
                          {owner.name}
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
                          onClick={() => handleDelete(owner.id)}
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
                  const owner = getVenueOwnerById(detailsModal);
                  if (!owner) return null;
                  return (
                    <div className="p-8">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-foreground">
                          Venue Owner Details
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
                          src={owner.profilePicture}
                          alt={owner.name}
                          className="w-24 h-24 rounded-xl object-cover border-2 border-primary/30 shadow-lg"
                        />
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-foreground mb-1">
                            {owner.name}
                          </h3>
                          <p className="text-muted-foreground mb-3">
                            {owner.email}
                          </p>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                owner.status
                              )}`}
                            >
                              {owner.status}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Registered {owner.dateRegistered}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Venue Info Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Venue Name
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {owner.venueName}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Venue Type
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {owner.venueType}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Location
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {owner.venueLocation}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground mb-1">
                            Capacity
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {owner.capacity} people
                          </p>
                        </div>
                      </div>

                      {/* Sports */}
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                          Supported Sports
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {owner.sports.map((sport, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm border border-primary/30"
                            >
                              {sport}
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

export default VenueManagement;
