import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { X, Eye, FileText, Image as ImageIcon, Download, MessageSquare } from "lucide-react";

interface Reply {
  message: string;
  date: string;
  author: string;
}

interface Ticket {
  _id: string;
  ticketId: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  replies: Reply[];
  createdAt: string;
  files?: Array<{ name: string; type?: string; preview?: string }>;
  attachment?: string;
}

const normalizeTicketsApiBase = () => {
  const raw = (import.meta as any).env?.VITE_API_BASE || "";
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
};

const buildTicketsApiUrl = (path: string) => {
  const base = normalizeTicketsApiBase();
  const root = base ? (base.endsWith("/api") ? base : `${base}/api`) : "/api";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${root}${normalizedPath}`;
};

const MyTickets: React.FC = () => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  const [toast, setToast] = useState({ isVisible: false, message: "", type: "success" as "success" | "error" });

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(buildTicketsApiUrl("/tickets/mine"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      setToast({ isVisible: true, message: err.message || "Error fetching tickets", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Replied":
        return "bg-sky-500/20 text-sky-400 border-sky-500/30";
      case "Closed":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="px-4 lg:px-8 py-8 max-w-6xl mx-auto">
        {/* Page Title */}
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-black text-foreground mb-8"
        >
          My Support <span className="text-primary">Tickets</span>
        </motion.h1>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading tickets...</div>
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-12 text-center shadow-md shadow-gray-800/30"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
            <div className="relative z-10">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">You have not created any tickets yet.</p>
            </div>
          </motion.div>
        )}

        {!loading && tickets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            {tickets.map((ticket) => (
              <motion.div
                key={ticket._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                        {ticket.subject}
                      </h3>
                      <span className="text-sm text-muted-foreground font-mono">{ticket.ticketId}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ticket.category}</p>
                    <p className="text-sm text-foreground mb-3 line-clamp-2">{ticket.description}</p>
                    <p className="text-xs text-muted-foreground">Created: {formatDate(ticket.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 sm:min-w-[140px]">
                    <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <button
                      onClick={() => setSelected(ticket)}
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-background rounded-xl font-bold hover:border-white/90 hover:border-2 box-border border-2 border-transparent transition-all duration-200 shadow-lg hover:scale-105 w-full sm:w-auto"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
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
                    <div>
                      <h2 className="text-2xl font-black text-foreground mb-1">{selected.subject}</h2>
                      <p className="text-sm text-muted-foreground">{selected.ticketId} — {selected.category}</p>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors border border-primary/20 hover:border-primary/60"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  </div>

                  {/* Ticket Info */}
                  <div className="space-y-4 mb-6 pb-6 border-b border-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selected.status)}`}>
                          {selected.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Created</p>
                        <p className="text-foreground text-sm">{formatDate(selected.createdAt)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Description</p>
                      <p className="text-foreground bg-muted p-4 rounded-xl">{selected.description}</p>
                    </div>

                    {/* Attachments */}
                    {((selected.files && selected.files.length > 0) || selected.attachment) && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Attachments ({(selected.files?.length || 0) + (selected.attachment ? 1 : 0)})
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {selected.files?.map((file, index) => {
                            const previewUrl = file.preview || file.name;
                            const isImage = file.type === 'image' || previewUrl.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i);
                            const isPdf = previewUrl.match(/\.pdf(\?.*)?$/i);
                            const fullUrl = previewUrl.startsWith('http') || previewUrl.startsWith('/') ? previewUrl : `/api${previewUrl.startsWith('/') ? '' : '/'}${previewUrl}`;
                            
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
                                    onClick={() => setViewingAttachment(fullUrl)}
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
                                  className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors text-sm font-medium border border-primary/20"
                                  download
                                >
                                  <Download className="w-4 h-4 inline mr-1" />
                                  Download
                                </a>
                              </div>
                            );
                          })}

                          {selected.attachment && (
                            (() => {
                              const attachmentUrl = selected.attachment;
                              const isImage = attachmentUrl.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i);
                              const isPdf = attachmentUrl.match(/\.pdf(\?.*)?$/i);
                              const fullUrl = attachmentUrl.startsWith('http') || attachmentUrl.startsWith('/') ? attachmentUrl : `/api${attachmentUrl.startsWith('/') ? '' : '/'}${attachmentUrl}`;
                              
                              return (
                                <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border border-border hover:border-primary/40 transition-colors">
                                  {isImage ? (
                                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                                  ) : (
                                    <FileText className="w-5 h-5 text-emerald-400" />
                                  )}
                                  <span className="text-sm text-foreground truncate max-w-[200px]">
                                    Ticket Attachment
                                  </span>
                                  {(isImage || isPdf) && (
                                    <button
                                      onClick={() => setViewingAttachment(fullUrl)}
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
                                    className="px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors text-sm font-medium border border-primary/20"
                                    download
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
                  </div>

                  {/* Replies Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Replies</h3>
                    {selected.replies.length === 0 ? (
                      <div className="p-4 bg-muted rounded-xl border border-border text-center">
                        <p className="text-sm text-muted-foreground">No replies yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selected.replies.map((reply, index) => (
                          <div
                            key={index}
                            className="bg-muted p-4 rounded-xl border border-border"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-foreground">{reply.author}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(reply.date)}</span>
                            </div>
                            <p className="text-foreground">{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Close Button */}
                  <div className="flex justify-end pt-4 border-t border-border">
                    <button
                      onClick={() => setSelected(null)}
                      className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors border border-primary/20 hover:border-primary/60 font-semibold"
                    >
                      Close
                    </button>
                  </div>
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
                onClick={(e: any) => e.stopPropagation()}
                className="bg-gradient-to-br from-primary/10 to-background border border-primary/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-black text-foreground">Attachment Preview</h3>
                    <button
                      onClick={() => setViewingAttachment(null)}
                      className="p-2 hover:bg-muted rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  </div>
                  {viewingAttachment.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i) || viewingAttachment.startsWith("data:image") ? (
                    <img
                      src={viewingAttachment}
                      alt="Attachment"
                      className="w-full rounded-xl max-h-[70vh] object-contain"
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
                  ) : (
                    <iframe
                      src={viewingAttachment}
                      className="w-full h-[600px] rounded-xl border border-border"
                      title="Attachment"
                      onError={(e) => {
                        const iframe = e.target as HTMLIFrameElement;
                        iframe.style.display = 'none';
                        const parent = iframe.parentElement;
                        if (parent) {
                          const downloadLink = document.createElement('a');
                          downloadLink.href = viewingAttachment;
                          downloadLink.download = 'attachment';
                          downloadLink.className = 'block px-6 py-3 bg-primary text-primary-foreground rounded-xl text-center';
                          downloadLink.textContent = 'Download Attachment';
                          parent.appendChild(downloadLink);
                        }
                      }}
                    />
                  )}
                  <div className="mt-4 flex gap-3 justify-end">
                    <a
                      href={viewingAttachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors"
                    >
                      Open in New Tab
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
};

export default MyTickets;
