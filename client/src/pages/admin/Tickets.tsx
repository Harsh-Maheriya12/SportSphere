import React, { useState, useEffect } from "react";
import DashboardLayout from "../../admin/DashboardLayout";
import {
  Search,
  Eye,
  MessageSquare,
  X,
  XCircle,
  FileText,
  Image as ImageIcon,
  Download,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "../../components/Toast";

interface TicketFile {
  name: string;
  type: "image" | "pdf" | "doc";
  preview: string;
}

interface TicketReply {
  message: string;
  date: string;
  author: string;
}

interface Ticket {
  id: string;
  subject: string;
  category: string;
  description: string;
  userName: string;
  userEmail: string;
  status: "Open" | "Replied" | "Closed";
  dateCreated: string;
  files: TicketFile[];
  attachment?: string | null;
  replies: TicketReply[];
}

const Tickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [toast, setToast] = useState({
    isVisible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  // Load tickets from backend (admin-protected)
  const getAdminToken = () => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const adminToken = getAdminToken();
        const res = await fetch('/api/admin/tickets', {
          method: 'GET',
          headers: {
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
        });
        if (!res.ok) {
          throw new Error('Failed to fetch tickets');
        }
        const data = await res.json();
        // Map backend ticket shape to frontend Ticket interface
        const mapped: Ticket[] = data.tickets.map((t: any) => ({
          id: t._id,
          subject: t.subject,
          category: t.category,
          description: t.description,
          userName: t.userName || t.user?.username || 'Unknown',
          userEmail: t.userEmail || t.user?.email || 'unknown@example.com',
          status: t.status,
          dateCreated: t.createdAt,
          files: (t.files || []).map((f: any) => ({ name: f.name, type: f.type || 'doc', preview: f.preview })),
          attachment: t.attachment || null,
          replies: (t.replies || []).map((r: any) => ({ message: r.message, date: r.date, author: r.author }))
        }));
        setTickets(mapped);

        // Check for ticketId in URL query params and auto-select that ticket
        const params = new URLSearchParams(window.location.search);
        const ticketId = params.get('ticketId');
        if (ticketId) {
          const ticket = mapped.find(t => t.id === ticketId);
          if (ticket) {
            setSelectedTicket(ticket);
            // Remove the query parameter from URL
            window.history.replaceState({}, '', '/admin/tickets');
          }
        }
      } catch (err: any) {
        console.error('fetchTickets error', err);
        setToast({ isVisible: true, message: err.message || 'Failed to load tickets', type: 'error' });
      }
    };
    fetchTickets();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Replied":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Closed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All Status" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    (async () => {
      try {
        const adminToken = getAdminToken();
        const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
          body: JSON.stringify({ message: replyMessage }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to send reply');
        }
        const data = await res.json();
        const t = data.ticket;
        const mapped: Ticket = {
          id: t._id,
          subject: t.subject,
          category: t.category,
          description: t.description,
          userName: t.userName || 'Unknown',
          userEmail: t.userEmail || 'unknown@example.com',
          status: t.status,
          dateCreated: t.createdAt,
          files: (t.files || []).map((f: any) => ({ name: f.name, type: f.type || 'doc', preview: f.preview })),
          replies: (t.replies || []).map((r: any) => ({ message: r.message, date: r.date, author: r.author }))
        };
        const updated = tickets.map((ticket) => (ticket.id === mapped.id ? mapped : ticket));
        setTickets(updated);
        setSelectedTicket(mapped);
        setReplyMessage('');
        setToast({ isVisible: true, message: 'Reply sent successfully!', type: 'success' });
      } catch (err: any) {
        console.error('sendReply error', err);
        setToast({ isVisible: true, message: err.message || 'Reply failed', type: 'error' });
      }
    })();
  };

  const handleCloseTicket = () => {
    if (!selectedTicket) return;
    (async () => {
      try {
        const adminToken = getAdminToken();
        const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/close`, {
          method: 'PATCH',
          headers: {
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to close ticket');
        }
        const data = await res.json();
        const t = data.ticket;
        const mapped: Ticket = {
          id: t._id,
          subject: t.subject,
          category: t.category,
          description: t.description,
          userName: t.userName || 'Unknown',
          userEmail: t.userEmail || 'unknown@example.com',
          status: t.status,
          dateCreated: t.createdAt,
          files: (t.files || []).map((f: any) => ({ name: f.name, type: f.type || 'doc', preview: f.preview })),
          replies: (t.replies || []).map((r: any) => ({ message: r.message, date: r.date, author: r.author }))
        };
        const updated = tickets.map((ticket) => (ticket.id === mapped.id ? mapped : ticket));
        setTickets(updated);
        setSelectedTicket(mapped);
        setToast({ isVisible: true, message: 'Ticket closed successfully!', type: 'success' });
      } catch (err: any) {
        console.error('closeTicket error', err);
        setToast({ isVisible: true, message: err.message || 'Close failed', type: 'error' });
      }
    })();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusCounts = {
    Open: tickets.filter((t) => t.status === "Open").length,
    Replied: tickets.filter((t) => t.status === "Replied").length,
    Closed: tickets.filter((t) => t.status === "Closed").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Title */}
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">
          Support Tickets
        </h1>

        {/* Main Panel */}
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tickets by ID, subject, or user..."
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
              <option>Open</option>
              <option>Replied</option>
              <option>Closed</option>
            </select>
          </div>

            {/* Tickets Table */}
            <div className="overflow-x-auto rounded-xl border border-primary/20">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/20 bg-muted/30">
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Ticket ID
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Subject
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      User Name
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Category
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">
                      Date Created
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
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No tickets found.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200"
                      >
                      <td className="py-4 px-4 text-foreground font-mono text-sm">
                        {ticket.id}
                      </td>
                      <td className="py-4 px-4 text-foreground">{ticket.subject}</td>
                      <td className="py-4 px-4 text-foreground">{ticket.userName}</td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {ticket.category}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground text-sm">
                        {formatDate(ticket.dateCreated)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="p-2 bg-orange-500 hover:bg-orange-600 text-background rounded-xl hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 hover:scale-105 shadow-lg"
                          title="View / Reply"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

            {/* Footer Summary */}
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground pt-4 border-t border-primary/20">
              <p>
                Showing {filteredTickets.length} of {tickets.length} tickets.
              </p>
              <p>
                Total: {statusCounts.Open} Open, {statusCounts.Replied} Replied,{" "}
                {statusCounts.Closed} Closed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View / Reply Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e: any) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-foreground">
                      Ticket Details
                    </h2>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  </div>

                  {/* Ticket Info */}
                  <div className="space-y-4 mb-6 pb-6 border-b border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Ticket ID
                        </p>
                        <p className="text-foreground font-mono">{selectedTicket.id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            selectedTicket.status
                          )}`}
                        >
                          {selectedTicket.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Subject</p>
                        <p className="text-foreground font-semibold">
                          {selectedTicket.subject}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Category</p>
                        <p className="text-foreground">{selectedTicket.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">User</p>
                        <p className="text-foreground">{selectedTicket.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedTicket.userEmail}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Date Created
                        </p>
                        <p className="text-foreground text-sm">
                          {formatDate(selectedTicket.dateCreated)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-foreground bg-muted p-4 rounded-xl">
                        {selectedTicket.description}
                      </p>
                    </div>

                    {/* Attachments */}
                    {(selectedTicket.files.length > 0 || selectedTicket.attachment) && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Attachments ({selectedTicket.files.length + (selectedTicket.attachment ? 1 : 0)})
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {selectedTicket.files.map((file, index) => {
                            const previewUrl = file.preview || file.name;
                            const isImage = file.type === 'image' || previewUrl.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i);
                            const isPdf = previewUrl.match(/\.pdf(\?.*)?$/i);
                            // Construct proper URL - ensure it's absolute or starts with /uploads
                            let fullUrl = previewUrl;
                            if (!previewUrl.startsWith('http')) {
                              // Ensure it starts with /uploads
                              if (!previewUrl.startsWith('/uploads')) {
                                // If it doesn't start with /, add /uploads/temp/ or use as-is
                                fullUrl = previewUrl.startsWith('/') ? previewUrl : `/uploads/temp/${previewUrl}`;
                              } else {
                                fullUrl = previewUrl;
                              }
                            }
                            
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border hover:border-primary/40 transition-colors"
                              >
                                {isImage ? (
                                  <ImageIcon className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <FileText className="w-5 h-5 text-emerald-400" />
                                )}
                                <span className="text-sm text-foreground truncate max-w-[200px]">
                                  {file.name || 'Attachment'}
                                </span>
                                {(isImage || isPdf) && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setViewingAttachment(fullUrl);
                                    }}
                                    className="p-2 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 hover:border-primary/60"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4 text-emerald-400" />
                                  </button>
                                )}
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={file.name || 'attachment'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Force download using fetch for proper handling
                                    if (!fullUrl.startsWith('http')) {
                                      e.preventDefault();
                                      fetch(fullUrl)
                                        .then(res => res.blob())
                                        .then(blob => {
                                          const url = window.URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = file.name || 'attachment';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          window.URL.revokeObjectURL(url);
                                        })
                                        .catch(err => {
                                          console.error('Download failed:', err);
                                          // Fallback to direct link
                                          window.open(fullUrl, '_blank');
                                        });
                                    }
                                  }}
                                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors text-sm font-medium border border-primary/20"
                                >
                                  <Download className="w-4 h-4 inline mr-1" />
                                  Download
                                </a>
                              </div>
                            );
                          })}

                          {/* If ticket has an attachment field (server-provided), show it */}
                          {selectedTicket.attachment && (
                            (() => {
                              const attachmentUrl = selectedTicket.attachment;
                              const isImage = attachmentUrl.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i);
                              const isPdf = attachmentUrl.match(/\.pdf(\?.*)?$/i);
                              // Construct proper URL - ensure it's absolute or starts with /uploads
                              let fullUrl = attachmentUrl;
                              if (!attachmentUrl.startsWith('http')) {
                                // Ensure it starts with /uploads
                                if (!attachmentUrl.startsWith('/uploads')) {
                                  // If it doesn't start with /, add /uploads/temp/ or use as-is
                                  fullUrl = attachmentUrl.startsWith('/') ? attachmentUrl : `/uploads/temp/${attachmentUrl}`;
                                } else {
                                  fullUrl = attachmentUrl;
                                }
                              }
                              
                              // Extract filename from path for download
                              const filename = attachmentUrl.split('/').pop() || 'attachment';
                              
                              return (
                                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border hover:border-primary/40 transition-colors">
                                  {isImage ? (
                                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                  )}
                                  <span className="text-sm text-foreground truncate max-w-[200px]">
                                    {filename || 'Ticket Attachment'}
                                  </span>
                                  {(isImage || isPdf) && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setViewingAttachment(fullUrl);
                                      }}
                                      className="p-2 hover:bg-primary/20 rounded-xl transition-colors border border-primary/20 hover:border-primary/60"
                                      title="View"
                                    >
                                      <Eye className="w-4 h-4 text-emerald-400" />
                                    </button>
                                  )}
                                  <a
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={filename}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Force download using fetch for proper handling
                                      if (!fullUrl.startsWith('http')) {
                                        e.preventDefault();
                                        fetch(fullUrl)
                                          .then(res => res.blob())
                                          .then(blob => {
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = filename;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          })
                                          .catch(err => {
                                            console.error('Download failed:', err);
                                            // Fallback to direct link
                                            window.open(fullUrl, '_blank');
                                          });
                                      }
                                    }}
                                    className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors text-sm font-medium border border-primary/20"
                                  >
                                    <Download className="w-4 h-4 inline mr-1" />
                                    Download
                                  </a>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    )}

                    {selectedTicket.files.length === 0 && !selectedTicket.attachment && (
                      <div className="p-4 bg-muted rounded-xl border border-border">
                        <p className="text-sm text-muted-foreground">No attachments available.</p>
                      </div>
                    )}
                  </div>

                  {/* Reply History */}
                  {selectedTicket.replies.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        Reply History
                      </h3>
                      <div className="space-y-4">
                        {selectedTicket.replies.map((reply, index) => (
                          <div
                            key={index}
                            className="bg-muted p-4 rounded-xl border border-border"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-foreground">
                                {reply.author}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(reply.date)}
                              </span>
                            </div>
                            <p className="text-foreground">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Section */}
                  {selectedTicket.status !== "Closed" && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        Reply to Ticket
                      </h3>
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl bg-muted text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none mb-4"
                        placeholder="Type your reply here..."
                      />
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleSendReply}
                          disabled={!replyMessage.trim()}
                          className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-background rounded-xl font-bold hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          Send Reply
                        </button>
                        <button
                          onClick={handleCloseTicket}
                          className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 shadow-lg hover:scale-105"
                        >
                          <XCircle className="w-4 h-4" />
                          Close Ticket
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Attachment Preview Modal */}
      <AnimatePresence>
        {viewingAttachment && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingAttachment(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e:any) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-foreground">
                      Attachment Preview
                    </h3>
                    <button
                      onClick={() => setViewingAttachment(null)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  </div>
                  {(() => {
                    const isImageFile = viewingAttachment.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i) || viewingAttachment.startsWith("data:image");
                    const isPdfFile = viewingAttachment.match(/\.pdf(\?.*)?$/i);
                    const filename = viewingAttachment.split('/').pop() || 'attachment';
                    
                    return (
                      <>
                        {isImageFile ? (
                          <img
                            src={viewingAttachment}
                            alt="Attachment"
                            className="w-full rounded-xl max-h-[70vh] object-contain bg-muted"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const parent = img.parentElement;
                              if (parent && !parent.querySelector('iframe')) {
                                const iframe = document.createElement('iframe');
                                iframe.src = viewingAttachment;
                                iframe.className = 'w-full h-[600px] rounded-xl border border-border';
                                iframe.title = 'Attachment';
                                parent.appendChild(iframe);
                              }
                            }}
                          />
                        ) : isPdfFile ? (
                          <iframe
                            src={`${viewingAttachment}#toolbar=0`}
                            className="w-full h-[600px] rounded-xl border border-border bg-muted"
                            title="Attachment"
                            onError={(e) => {
                              const iframe = e.target as HTMLIFrameElement;
                              iframe.style.display = 'none';
                              const parent = iframe.parentElement;
                              if (parent && !parent.querySelector('.download-fallback')) {
                                const downloadDiv = document.createElement('div');
                                downloadDiv.className = 'download-fallback p-6 text-center bg-muted rounded-xl border border-border';
                                const downloadLink = document.createElement('a');
                                downloadLink.href = viewingAttachment;
                                downloadLink.download = filename;
                                downloadLink.className = 'inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl text-center hover:bg-primary/90 transition-colors';
                                downloadLink.textContent = 'Download Attachment';
                                downloadDiv.appendChild(downloadLink);
                                parent.appendChild(downloadDiv);
                              }
                            }}
                          />
                        ) : (
                          <div className="p-6 text-center bg-muted rounded-xl border border-border">
                            <p className="text-muted-foreground mb-4">Preview not available for this file type.</p>
                            <a
                              href={viewingAttachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={filename}
                              onClick={(e) => {
                                if (!viewingAttachment.startsWith('http')) {
                                  e.preventDefault();
                                  fetch(viewingAttachment)
                                    .then(res => res.blob())
                                    .then(blob => {
                                      const url = window.URL.createObjectURL(blob);
                                      const link = document.createElement('a');
                                      link.href = url;
                                      link.download = filename;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      window.URL.revokeObjectURL(url);
                                    })
                                    .catch(err => {
                                      console.error('Download failed:', err);
                                      window.open(viewingAttachment, '_blank');
                                    });
                                }
                              }}
                              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                            >
                              Download Attachment
                            </a>
                          </div>
                        )}
                        <div className="mt-4 flex gap-3 justify-end">
                          <a
                            href={viewingAttachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={filename}
                            onClick={(e) => {
                              if (!viewingAttachment.startsWith('http')) {
                                e.preventDefault();
                                fetch(viewingAttachment)
                                  .then(res => res.blob())
                                  .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  })
                                  .catch(err => {
                                    console.error('Download failed:', err);
                                    window.open(viewingAttachment, '_blank');
                                  });
                              }
                            }}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors"
                          >
                            {isPdfFile ? 'Download PDF' : 'Download Attachment'}
                          </a>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </DashboardLayout>
  );
};

export default Tickets;

