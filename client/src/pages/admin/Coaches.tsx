import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../admin/DashboardLayout';
import { fetchCoaches, deleteCoachApi } from '../../services/adminApi';
import { Eye, Trash2, Search, X } from 'lucide-react';

const CoachesAdminPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any | null>(null);

  const getAdminToken = () => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('adminToken') : null;
  };

  const load = async () => {
    try {
      const adminToken = getAdminToken();
      const res = await fetchCoaches(adminToken, { q: query });
      setItems(res.data || res);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, []);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toDeleteId, setToDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const adminToken = getAdminToken();
      await deleteCoachApi(adminToken, id);
      setItems(items.filter((it: any) => it.user._id !== id));
      setSelected(null);
      setToDeleteId(null);
      setDeleteModalOpen(false);
    } catch (err) { console.error(err); alert('Failed to delete'); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-4xl sm:text-5xl font-black text-foreground">Coach Management</h1>

        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background border border-primary/20 hover:border-primary/60 transition-all p-6 shadow-md shadow-gray-800/30">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-black text-foreground mb-6">All Coaches</h2>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search coaches by name or email..." className="w-full pl-10 pr-4 py-3 bg-muted border border-primary/20 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/60 transition-all" />
              </div>
              <button onClick={load} className="px-4 py-3 bg-primary text-primary-foreground rounded-xl">Search</button>
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/20 bg-muted/30">
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Name</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Email</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Registered</th>
                    <th className="text-left py-4 px-4 text-sm font-black text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any) => (
                    <tr key={it.user._id} className="border-b border-primary/10 hover:bg-primary/5 transition-all duration-200">
                      <td className="py-4 px-4">{it.user.username}</td>
                      <td className="py-4 px-4 text-muted-foreground">{it.user.email}</td>
                      <td className="py-4 px-4">{it.user.verificationStatus}</td>
                      <td className="py-4 px-4 text-foreground">{new Date(it.user.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setSelected(it); setDetailsModalOpen(true); }} className="p-2 bg-muted hover:bg-primary/20 text-foreground hover:text-primary rounded-xl transition-all duration-200 hover:scale-105 border border-primary/20 hover:border-primary/60" title="View Details"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setToDeleteId(it.user._id); setDeleteModalOpen(true); }} className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-sm"> <Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Details Modal */}
            {detailsModalOpen && selected && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailsModalOpen(false)}>
                <div className="bg-gradient-to-br from-primary/10 to-background rounded-2xl border border-primary/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-black text-foreground">Coach Details</h3>
                    <button onClick={() => setDetailsModalOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                      <X className="w-5 h-5 text-foreground" />
                    </button>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Name</p>
                        <p className="text-foreground font-semibold">{selected.user.username}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Email</p>
                        <p className="text-foreground font-semibold">{selected.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Status</p>
                        <p className="text-foreground font-semibold">{selected.user.verificationStatus || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Created</p>
                        <p className="text-foreground font-semibold">{new Date(selected.user.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  {selected.user.proof && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-foreground mb-4">Verification Proof Document</h4>
                      <div className="bg-gradient-to-br from-primary/10 to-background rounded-xl p-4 border border-primary/20">
                        {selected.user.proof.match(/\.(png|jpe?g|gif|webp)(\?.*)?$/i) ? (
                          <div className="relative">
                            <img 
                              src={selected.user.proof} 
                              alt="proof" 
                              className="w-full rounded-xl shadow-lg max-h-[600px] object-contain"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.display = 'none';
                                const parent = img.parentElement;
                                if (parent && !parent.querySelector('iframe')) {
                                  const iframe = document.createElement('iframe');
                                  iframe.src = selected.user.proof;
                                  iframe.className = 'w-full h-[600px] rounded-xl border border-border';
                                  iframe.title = 'proof';
                                  parent.appendChild(iframe);
                                }
                              }}
                            />
                            <a
                              href={selected.user.proof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-4 right-4 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors shadow-lg"
                            >
                              Open Full Size
                            </a>
                          </div>
                        ) : (
                          <div className="relative">
                            <iframe 
                              src={selected.user.proof} 
                              title="proof" 
                              className="w-full h-[600px] rounded-xl border border-border"
                              onError={(e) => {
                                const iframe = e.target as HTMLIFrameElement;
                                iframe.style.display = 'none';
                                const parent = iframe.parentElement;
                                if (parent) {
                                  const downloadLink = document.createElement('a');
                                  downloadLink.href = selected.user.proof;
                                  downloadLink.download = 'verification-proof.pdf';
                                  downloadLink.className = 'block px-6 py-3 bg-primary text-primary-foreground rounded-xl text-center';
                                  downloadLink.textContent = 'Download Proof Document';
                                  parent.appendChild(downloadLink);
                                }
                              }}
                            />
                            <a
                              href={selected.user.proof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-4 right-4 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors shadow-lg"
                            >
                              Open in New Tab
                            </a>
                          </div>
                        )}
                        <div className="mt-4 flex gap-3">
                          <a
                            href={selected.user.proof}
                            download
                            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors border border-primary/20"
                          >
                            Download Proof
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selected.user.proof && (
                    <div className="mb-6 p-4 bg-muted rounded-xl border border-border">
                      <p className="text-muted-foreground">No proof document available.</p>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-border flex gap-3">
                    <button onClick={() => setDetailsModalOpen(false)} className="px-6 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors">Close</button>
                    <button onClick={() => { setToDeleteId(selected.user._id); setDeleteModalOpen(true); setDetailsModalOpen(false); }} className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors font-semibold">Delete</button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && toDeleteId && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-gradient-to-br from-primary/10 to-background rounded-2xl border border-primary/20 max-w-md w-full p-6">
                  <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
                  <p className="text-muted-foreground mb-4">Are you sure you want to delete this coach? This action cannot be undone.</p>
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

export default CoachesAdminPage;
