import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../admin/DashboardLayout';
import { fetchUsers, deleteUserApi } from '../../services/adminApi';
import { Eye, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  const getAdminToken = () => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
  };

  const load = async () => {
    try {
      const adminToken = getAdminToken();
      const res = await fetchUsers(adminToken, { q: query });
      setUsers(res.data || res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = async () => {
    await load();
  };

  const handleDelete = async (id: string) => {
    try {
      const adminToken = getAdminToken();
      const res = await deleteUserApi(adminToken, id);
      // if backend returns success flag, check it
      if (res && res.success === false) throw new Error(res.message || 'Delete failed');
      setUsers(users.filter((u) => u._id !== id));
      setSelected(null);
      setToDeleteId(null);
      setDeleteModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to delete');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">User Management</h1>

        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-foreground mb-6">All Users</h2>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users by name or email..." className="w-full pl-10 pr-4 py-3 bg-muted border border-primary/20 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all" />
              </div>
              <button onClick={handleSearch} className="px-4 py-3 bg-primary text-primary-foreground rounded-xl">Search</button>
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/20 bg-muted/30">
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Username</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Email</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Role</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Created</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200">
                      <td className="py-4 px-4">{u.username}</td>
                      <td className="py-4 px-4 text-muted-foreground">{u.email}</td>
                      <td className="py-4 px-4">{u.role}</td>
                      <td className="py-4 px-4 text-foreground">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelected(u); setDetailsModalOpen(true); }} className="p-2 bg-muted hover:bg-primary/20 text-foreground hover:text-primary rounded-xl transition-all duration-200 hover:scale-105 border border-primary/20 hover:border-primary/60" title="View Details"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setToDeleteId(u._id); setDeleteModalOpen(true); }} className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-sm"> <Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Details Modal */}
            <AnimatePresence>
              {detailsModalOpen && selected && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setDetailsModalOpen(false); setSelected(null); }}>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gradient-to-br from-primary/10 to-background rounded-2xl border border-primary/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-black text-foreground">User Details</h3>
                      <button onClick={() => { setDetailsModalOpen(false); setSelected(null); }} className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <X className="w-5 h-5 text-foreground" />
                      </button>
                    </div>

                    <div className="space-y-6">
                      {/* Profile Photo */}
                      {selected.profilePhoto && (
                        <div className="flex justify-center mb-6">
                          <img
                            src={selected.profilePhoto}
                            alt={selected.username}
                            className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Username</p>
                          <p className="text-foreground font-semibold">{selected.username}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Email</p>
                          <p className="text-foreground font-semibold">{selected.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Role</p>
                          <p className="text-foreground font-semibold capitalize">{selected.role}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Age</p>
                          <p className="text-foreground font-semibold">{selected.age || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Gender</p>
                          <p className="text-foreground font-semibold capitalize">{selected.gender || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Verified</p>
                          <p className={`font-semibold ${selected.verified ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {selected.verified ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Auth Provider</p>
                          <p className="text-foreground font-semibold capitalize">{selected.authProvider || 'local'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Created At</p>
                          <p className="text-foreground font-semibold">{new Date(selected.createdAt).toLocaleString()}</p>
                        </div>
                        {selected.updatedAt && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                            <p className="text-foreground font-semibold">{new Date(selected.updatedAt).toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {/* Verification Proof (if coach or venue-owner) */}
                      {(selected.role === 'coach' || selected.role === 'venue-owner') && selected.proof && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <h4 className="text-lg font-semibold text-foreground mb-4">Verification Proof Document</h4>
                          <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                            {selected.proof.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i) ? (
                              <div className="relative">
                                <img
                                  src={selected.proof}
                                  alt="proof"
                                  className="w-full rounded-xl shadow-lg max-h-[600px] object-contain"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                    const parent = img.parentElement;
                                    if (parent && !parent.querySelector('iframe')) {
                                      const iframe = document.createElement('iframe');
                                      iframe.src = selected.proof;
                                      iframe.className = 'w-full h-[600px] rounded-xl border border-border';
                                      iframe.title = 'proof';
                                      parent.appendChild(iframe);
                                    }
                                  }}
                                />
                                <a
                                  href={selected.proof}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                  download
                                >
                                  Download Proof
                                </a>
                              </div>
                            ) : selected.proof.match(/\.pdf$/i) ? (
                              <div>
                                <iframe
                                  src={selected.proof}
                                  title="proof"
                                  className="w-full h-96 rounded-md border border-border"
                                />
                                <a
                                  href={selected.proof}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                  download
                                >
                                  Download Proof
                                </a>
                              </div>
                            ) : (
                              <a
                                href={selected.proof}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 underline"
                              >
                                View Document
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-border flex gap-3 justify-end">
                      <button
                        onClick={() => { setDetailsModalOpen(false); setSelected(null); }}
                        className="px-6 py-3 bg-muted text-foreground rounded-xl hover:bg-muted/80 transition-all border border-primary/20 hover:border-primary/60 font-semibold"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setToDeleteId(selected._id);
                          setDeleteModalOpen(true);
                          setDetailsModalOpen(false);
                        }}
                        className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold shadow-lg transition-all duration-200 hover:scale-105"
                      >
                        Delete User
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && toDeleteId && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-primary/10 to-background rounded-2xl border border-primary/20 max-w-md w-full p-6">
                  <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
                  <p className="text-muted-foreground mb-4">Are you sure you want to delete this user? This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button onClick={() => { setDeleteModalOpen(false); setToDeleteId(null); }} className="px-4 py-2 bg-muted rounded-lg">Cancel</button>
                    <button onClick={() => handleDelete(toDeleteId!)} className="px-4 py-2 bg-rose-500 text-white rounded-lg">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UsersAdminPage;
