import { useState, useEffect } from 'react';
import axios from 'axios';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';

const STATUS_FILTERS = ['All','Open','Active','Full','Closed'];
// Cancelled events are never visible to players

export default function Events() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('All');

  useEffect(() => {
    axios.get('/api/events')
      .then(r => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter(e => {
    if (e.status === 'Cancelled') return false; // never show cancelled events to players
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || (e.venueName||'').toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'All' || e.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header">
          <h1>🏆 Sports <span className="gradient-text">Events</span></h1>
          <p>Register your team and compete for glory</p>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24, alignItems:'center' }}>
          <input className="form-input" placeholder="Search events..." style={{ maxWidth:280 }}
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {STATUS_FILTERS.map(s => (
              <button key={s} className={`btn btn-sm ${status===s?'btn-primary':'btn-ghost'}`}
                style={{ borderRadius:50 }} onClick={() => setStatus(s)}>{s}</button>
            ))}
          </div>
        </div>

        {loading ? <Loader fullPage={false} /> : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <div className="empty-title">No Events Found</div>
            <div className="empty-desc">Check back later for upcoming tournaments</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:24 }}>
            {filtered.map(e => <EventCard key={e._id} event={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}
