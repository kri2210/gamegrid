import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const playerLinks = [
  { to: '/explore',     label: 'Explore',    icon: '🏟️' },
  { to: '/events',      label: 'Events',     icon: '🏆' },
  { to: '/my-bookings', label: 'My Bookings',icon: '📋' },
];
const ownerLinks = [
  { to: '/owner/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/owner/venues',    label: 'My Venues', icon: '🏟️' },
  { to: '/owner/bookings',  label: 'Bookings',  icon: '📋' },
  { to: '/owner/slots',     label: 'Slots',     icon: '🕐' },
  { to: '/owner/events',    label: 'Events',    icon: '🏆' },
];

export default function Navbar() {
  const { user, logout, toggleTheme, theme } = useAuth();
  const [open, setOpen] = useState(false);
  const dropRef = useRef();
  const navigate = useNavigate();

  const links = user?.role === 'owner' ? ownerLinks : playerLinks;

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand" onClick={() => navigate('/')} style={{cursor:'pointer'}}>
          GAMEGRID
        </span>

        <div className="navbar-links">
          {user && links.map(l => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span>{l.icon}</span>
              <span className="nav-link-text">{l.label}</span>
            </NavLink>
          ))}

          <button className="btn btn-ghost btn-sm" onClick={toggleTheme} title="Toggle theme" style={{padding:'8px',borderRadius:'50%'}}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="nav-dropdown" ref={dropRef}>
              <div className="nav-avatar" onClick={() => setOpen(o => !o)}>
                {user.name[0].toUpperCase()}
              </div>
              {open && (
                <div className="nav-dropdown-menu">
                  <div className="nav-dropdown-item" style={{flexDirection:'column',alignItems:'flex-start',cursor:'default'}}>
                    <span style={{fontWeight:700,fontSize:'0.9rem'}}>{user.name}</span>
                    <span style={{fontSize:'0.75rem',color:'var(--text-3)'}}>{user.role}</span>
                  </div>
                  <div className="nav-dropdown-divider"/>
                  <div className="nav-dropdown-item" onClick={handleLogout}>
                    <span>🚪</span> Logout
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink to="/login"    className="btn btn-ghost btn-sm">Login</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Sign Up</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
