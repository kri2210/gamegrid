import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { InlineLoader } from '../components/Loader';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}! 👋`);
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/explore');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide">
        <div className="auth-brand">
          <div style={{ fontFamily:'var(--font-brand)', fontSize:'1.8rem', fontWeight:900, marginBottom:8 }} className="gradient-text">GAMEGRID</div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="text-muted text-sm" style={{ marginTop:8 }}>Sign in to book venues & join events</p>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="••••••••"
              value={form.password} onChange={handle} required />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ marginTop:8 }}>
            {loading ? <InlineLoader /> : '🔑 Sign In'}
          </button>
        </form>

        <p className="text-muted text-sm" style={{ textAlign:'center', marginTop:24 }}>
          Don't have an account? <Link to="/register" className="text-green fw-700">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
