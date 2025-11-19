import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Admin credentials: prefer env variables, fallback to defaults for dev
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Hardcoded check (development-only). For production use seeded admin and proper auth.
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const FAKE_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'hardcoded-admin-token';
        localStorage.setItem('adminToken', FAKE_TOKEN);
        localStorage.setItem('adminUser', JSON.stringify({ username: 'admin', email: ADMIN_EMAIL }));
        navigate('/admin');
        return;
      }

      alert('Invalid admin credentials');
    } catch (err) {
      console.error(err);
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white/10 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">SportSphere</h1>
          <h2 className="text-2xl font-semibold text-foreground">Admin Console</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your admin credentials</p>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-foreground mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <input id="admin-email" value={email} onChange={(e)=>setEmail(e.target.value)} className="appearance-none block w-full pl-10 pr-3 py-3 border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground hover:border-primary hover:border-2 border-2 transition-colors" placeholder="admin@example.com" required />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-foreground mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <input id="admin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e)=>setPassword(e.target.value)} className="appearance-none block w-full pl-10 pr-10 py-3 border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-input text-foreground hover:border-primary hover:border-2 border-2 transition-colors" placeholder="••••••••" required />
                <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {showPassword ? <EyeOff className="h-5 w-5 text-muted-foreground" /> : <Eye className="h-5 w-5 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className={`group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-xl text-primary-foreground bg-primary hover:border-white/90 hover:border-2 box-border border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-colors ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-primary-foreground" />
                    Signing in...
                  </>
                ) : ('Sign in')}
              </button>
            </div>

            <div className="flex items-center justify-center">
              <button type="button" onClick={()=>{ localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser'); alert('Cleared admin session'); }} className="text-sm text-muted-foreground">Clear admin session</button>
            </div>
          </form>

          <p className="text-xs text-muted-foreground mt-4">Dev mode: admin email/password from env or defaults: {ADMIN_EMAIL} / {ADMIN_PASSWORD}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
