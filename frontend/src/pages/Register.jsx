import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { InlineLoader } from '../components/Loader';

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ name:'', email:'', phone:'', password:'', role:'player' });
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.phone) { toast.error('Phone number is required'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const user = await register(form);
      toast.success(`Welcome to GameGrid, ${user.name}! 🎉`);
      navigate(user.role === 'owner' ? '/owner/dashboard' : '/explore');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-slide">
        <div className="auth-brand">
          <div style={{ fontFamily:'var(--font-brand)', fontSize:'1.8rem', fontWeight:900, marginBottom:8 }} className="gradient-text">GAMEGRID</div>
          <h2 className="auth-title">Create Account</h2>
          <p className="text-muted text-sm" style={{ marginTop:8 }}>Join thousands of sports enthusiasts</p>
        </div>

        {/* Role toggle */}
        <div className="auth-role-toggle" style={{ marginBottom:20 }}>
          {['player', 'owner'].map(r => (
            <button key={r} type="button"
              className={`auth-role-btn${form.role === r ? ' active' : ''}`}
              onClick={() => setForm(f => ({ ...f, role: r }))}>
              {r === 'player' ? '🏃 Player' : '🏟️ Venue Owner'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="name" type="text" className="form-input" placeholder="John Doe"
              value={form.name} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-input" placeholder="you@example.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input name="phone" type="tel" className="form-input" placeholder="+91 99999 99999"
              value={form.phone} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="Min 6 characters"
              value={form.password} onChange={handle} required />
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ marginTop:8 }}>
            {loading ? <InlineLoader /> : '🚀 Create Account'}
          </button>
        </form>

        <p className="text-muted text-sm" style={{ textAlign:'center', marginTop:24 }}>
          Already have an account? <Link to="/login" className="text-green fw-700">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
