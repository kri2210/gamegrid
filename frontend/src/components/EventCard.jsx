import { useNavigate } from 'react-router-dom';

const STATUS_BADGE = {
  Open:      'badge-green',
  Active:    'badge-blue',
  Closed:    'badge-gray',
  Full:      'badge-orange',
  Cancelled: 'badge-red',
};

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const spotsLeft = event.maxTeams - (event.registeredTeamsCount || 0);

  return (
    <div className="event-card animate-fade" onClick={() => navigate(`/events/${event._id}`)}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <div className="event-title">{event.name}</div>
          <div style={{ fontSize:'0.85rem', color:'var(--text-2)' }}>📍 {event.venueName}</div>
        </div>
        <span className={`badge ${STATUS_BADGE[event.status] || 'badge-gray'}`}>{event.status}</span>
      </div>

      <div className="event-meta">
        <span className="event-meta-item">📅 {event.startDate}</span>
        <span className="event-meta-item">🕐 {event.eventTime}</span>
        <span className="event-meta-item">👥 {spotsLeft} spots left</span>
        {event.entryFee > 0 && <span className="event-meta-item">🎟 ₹{event.entryFee} entry</span>}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:'0.7rem', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Prize Pool</div>
          <div className="event-prize">{event.prizePool || 'TBD'}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>Teams</div>
          <div style={{ fontSize:'1.1rem', fontWeight:700 }}>
            {event.registeredTeamsCount}/{event.maxTeams}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop:12, background:'rgba(255,255,255,0.06)', borderRadius:4, height:6 }}>
        <div style={{
          height:6, borderRadius:4,
          background:'linear-gradient(90deg,var(--neon-purple),var(--neon-blue))',
          width:`${Math.min(100, ((event.registeredTeamsCount||0)/event.maxTeams)*100)}%`,
          transition:'width 0.6s ease'
        }} />
      </div>
    </div>
  );
}
