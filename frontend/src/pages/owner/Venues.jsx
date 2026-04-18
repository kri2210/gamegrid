import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

export default function OwnerVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    axios.get('/api/owner/venues')
      .then(r => setVenues(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const deleteVenue = async (id, name) => {
    if (!confirm(`Delete venue "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/owner/venues/${id}`);
      toast.success('Venue deleted');
      load();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return <Loader fullPage={false}/>;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1>My <span className="gradient-text">Venues</span></h1>
            <p>Manage your sports venues</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/owner/venues/add')}>+ Add Venue</button>
        </div>

        {venues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏟️</div>
            <div className="empty-title">No Venues Yet</div>
            <div className="empty-desc">Add your first venue to start accepting bookings</div>
            <button className="btn btn-primary" onClick={() => navigate('/owner/venues/add')}>Add Venue</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:24 }}>
            {venues.map(v => (
              <div key={v._id} className="card animate-fade">
                <div style={{ height:160, borderRadius:10, overflow:'hidden', marginBottom:16, background:'rgba(0,255,136,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}>
                  <img src={`/api/venues/${v._id}/image`} alt={v.name}
                    style={{ width:'100%', height:'100%', objectFit:'cover' }}
                    onError={e => { e.target.style.display='none'; }} />
                  <span>🏟️</span>
                </div>
                <div className="fw-700" style={{ fontSize:'1.05rem', marginBottom:4 }}>{v.name}</div>
                <div className="text-muted text-sm mb-4">📍 {v.city} · {v.activeHoursStart}–{v.activeHoursEnd}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                  {v.sports?.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
                </div>
                {v.locationUrl && (
                  <div style={{ marginBottom:12 }}>
                    <a href={v.locationUrl} target="_blank" rel="noreferrer" className="text-green text-sm">🗺️ View Location</a>
                  </div>
                )}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button className="btn btn-outline btn-sm w-full" onClick={() => navigate(`/owner/venues/${v._id}/edit`)}>✏️ Edit</button>
                  <button className="btn btn-danger btn-sm w-full" onClick={() => deleteVenue(v._id, v.name)}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
