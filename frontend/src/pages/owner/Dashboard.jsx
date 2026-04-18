import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import axios from 'axios';
import Loader from '../../components/Loader';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${color}`}>{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const [revenue,   setRevenue]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('/api/owner/revenue')
      .then(r => setRevenue(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader fullPage={false} />;

  const maxRev = revenue?.daily ? Math.max(...revenue.daily.map(d => d.revenue), 1) : 1;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header">
          <h1>Owner <span className="gradient-text">Dashboard</span></h1>
          <p>Your venues and bookings at a glance</p>
        </div>

        {/* Quick actions */}
        <div style={{ display:'flex', gap:12, marginBottom:32, flexWrap:'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/owner/venues/add')}>+ Add Venue</button>
          <button className="btn btn-outline" onClick={() => navigate('/owner/events/create')}>+ Create Event</button>
          <button className="btn btn-ghost" onClick={() => navigate('/owner/bookings')}>View Bookings</button>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20, marginBottom:32 }}>
          <StatCard icon="💰" label="Total Revenue" value={`₹${(revenue?.totalRevenue||0).toLocaleString()}`} color="green" />
          <StatCard icon="📋" label="Total Bookings" value={revenue?.totalBookings||0} color="blue" />
          <StatCard icon="🏟️" label="Venues" value={revenue?.venues||0} color="purple" />
          <StatCard icon="⏳" label="Pending Revenue" value={`₹${(revenue?.pendingAmount||0).toLocaleString()}`} color="orange" />
        </div>

        {/* Revenue Chart */}
        {revenue?.daily && (
          <div className="card" style={{ marginBottom:32 }}>
            <h3 style={{ marginBottom:24 }}>📈 Revenue Last 7 Days</h3>
            <div className="chart-bar-wrap">
              {revenue.daily.map(d => (
                <div key={d.date} className="chart-bar-col">
                  <div className="chart-bar" style={{ height:`${(d.revenue/maxRev)*100}px` }} title={`₹${d.revenue}`} />
                  <div className="chart-bar-label">{d.date.slice(5)}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:24, marginTop:16, flexWrap:'wrap' }}>
              <div><span className="text-faint text-sm">Online: </span><span className="fw-700">{revenue.onlineBookings}</span></div>
              <div><span className="text-faint text-sm">Walk-in: </span><span className="fw-700">{revenue.offlineBookings}</span></div>
              <div><span className="text-faint text-sm">Paid: </span><span className="fw-700 text-green">₹{(revenue.paidAmount||0).toLocaleString()}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
