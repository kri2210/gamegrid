import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader, { InlineLoader } from '../components/Loader';

const PAYMENT_OPTIONS = [
  { value:'online', icon:'💳', label:'Online' },
  { value:'card',   icon:'🏦', label:'Card' },
  { value:'upi',    icon:'📲', label:'UPI' },
  { value:'cash',   icon:'💵', label:'Cash' },
];

export default function EventDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [event,   setEvent]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    teamName:'', numberOfPlayers:'', members:'', paymentMethod:'online'
  });

  useEffect(() => {
    axios.get(`/api/events/${id}`)
      .then(r => setEvent(r.data))
      .catch(() => navigate('/events'))
      .finally(() => setLoading(false));
  }, [id]);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.teamName.trim()) { toast.error('Team name is required'); return; }
    if (!form.numberOfPlayers) { toast.error('Number of players is required'); return; }
    setSubmitting(true);
    try {
      await axios.post(`/api/events/${id}/register`, {
        ...form,
        members: form.members ? form.members.split(',').map(m => m.trim()) : []
      });
      toast.success('Team registered successfully! 🎉');
      navigate('/my-bookings');
    } catch(err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Loader />;
  if (!event)  return null;

  const spotsLeft = event.maxTeams - (event.registeredTeamsCount || 0);
  const canRegister = ['Open','Active'].includes(event.status) && spotsLeft > 0;

  return (
    <div className="page-wrap">
      <div className="container" style={{ maxWidth:900 }}>
        <div style={{ marginTop:24 }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:24 }}>
            <div>
              <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/events')}>← Back</button>
              <h1 style={{ marginBottom:8 }}>{event.name}</h1>
              <div className="text-muted">🏟️ {event.venueName} &nbsp;·&nbsp; {event.venueAddress}</div>
            </div>
            <span className={`badge ${event.status==='Open'?'badge-green':event.status==='Full'?'badge-orange':'badge-gray'}`} style={{ fontSize:'0.9rem', padding:'8px 16px' }}>
              {event.status}
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:32 }}>
            {/* Left */}
            <div>
              {/* Event Info */}
              <div className="card mb-6">
                <h3 style={{ marginBottom:16 }}>📅 Event Details</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[
                    ['Start Date', event.startDate],
                    ['End Date',   event.endDate || event.startDate],
                    ['Time',       event.eventTime],
                    ['Entry Fee',  event.entryFee > 0 ? `₹${event.entryFee}` : 'Free'],
                    ['Max Teams',  event.maxTeams],
                    ['Registered', event.registeredTeamsCount],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <div className="text-sm text-faint" style={{ textTransform:'uppercase', letterSpacing:'0.05em' }}>{k}</div>
                      <div className="fw-700">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prize Pool */}
              <div className="card mb-6" style={{ borderColor:'rgba(255,122,0,0.3)', background:'rgba(255,122,0,0.05)' }}>
                <div className="text-sm text-faint mb-4">PRIZE POOL</div>
                <div style={{ fontSize:'2.5rem', fontWeight:900, color:'var(--neon-orange)' }}>
                  {event.prizePool || 'TBD'}
                </div>
              </div>

              {event.description && (
                <div className="card mb-6">
                  <h3 style={{ marginBottom:12 }}>About this Event</h3>
                  <p>{event.description}</p>
                </div>
              )}

              {event.facilities?.length > 0 && (
                <div className="card mb-6">
                  <h3 style={{ marginBottom:12 }}>🏅 Facilities</h3>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {event.facilities.map(f => <span key={f} className="badge badge-blue">{f}</span>)}
                  </div>
                </div>
              )}

              {/* Teams */}
              {event.teams?.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom:16 }}>👥 Registered Teams</h3>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {event.teams.map((t,i) => (
                      <div key={t._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'rgba(255,255,255,0.04)', borderRadius:10 }}>
                        <div style={{ width:32, height:32, background:'linear-gradient(135deg,var(--neon-purple),var(--neon-blue))', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.8rem' }}>
                          {i+1}
                        </div>
                        <div className="fw-700">{t.teamName}</div>
                        <div className="text-faint text-sm" style={{ marginLeft:'auto' }}>{t.numberOfPlayers} players</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Registration Panel */}
            <div>
              {/* Progress */}
              <div className="card mb-4">
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span className="text-sm text-muted">Teams Registered</span>
                  <span className="fw-700">{event.registeredTeamsCount}/{event.maxTeams}</span>
                </div>
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:8, height:10, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'linear-gradient(90deg,var(--neon-purple),var(--neon-blue))', width:`${Math.min(100,((event.registeredTeamsCount||0)/event.maxTeams)*100)}%`, transition:'width 0.6s ease', borderRadius:8 }} />
                </div>
                <div className="text-sm mt-4" style={{ color: spotsLeft > 0 ? 'var(--neon-green)' : '#ff4444' }}>
                  {spotsLeft > 0 ? `${spotsLeft} spots remaining` : 'No spots left'}
                </div>
              </div>

              <div style={{ marginBottom:12, fontSize:'0.8rem', color:'var(--text-3)' }}>
                Reg. deadline: {event.lastRegistrationDate}
              </div>

              {canRegister && !showForm && (
                <button className="btn btn-primary w-full" onClick={() => setShowForm(true)}>
                  🏆 Register Your Team
                </button>
              )}

              {!canRegister && (
                <div style={{ textAlign:'center', padding:16, background:'rgba(255,68,68,0.06)', border:'1px solid rgba(255,68,68,0.2)', borderRadius:'var(--radius-sm)', color:'#ff4444', fontSize:'0.875rem' }}>
                  Registration {event.status === 'Full' ? 'is full' : 'is closed'}
                </div>
              )}

              {showForm && (
                <form className="card" onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <h3 style={{ marginBottom:4 }}>Register Team</h3>
                  <div className="form-group">
                    <label className="form-label">Team Name *</label>
                    <input name="teamName" className="form-input" placeholder="Team Alpha..."
                      value={form.teamName} onChange={handle} required />
                    <div className="form-hint">Must be unique for this event</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Players *</label>
                    <input name="numberOfPlayers" type="number" min={1} className="form-input"
                      value={form.numberOfPlayers} onChange={handle} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Player Names (comma-separated)</label>
                    <input name="members" className="form-input" placeholder="John, Jane, Alex..."
                      value={form.members} onChange={handle} />
                  </div>

                  <label className="form-label">Payment</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    {PAYMENT_OPTIONS.map(opt => (
                      <div key={opt.value}
                        style={{ padding:'10px 8px', borderRadius:10, border:`1.5px solid ${form.paymentMethod===opt.value?'var(--neon-green)':'var(--border)'}`, background:form.paymentMethod===opt.value?'rgba(0,255,136,0.08)':'transparent', cursor:'pointer', textAlign:'center', fontSize:'0.8rem', fontWeight:600 }}
                        onClick={() => setForm(f => ({ ...f, paymentMethod: opt.value }))}>
                        {opt.icon} {opt.label}
                      </div>
                    ))}
                  </div>

                  {event.entryFee > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span className="text-muted">Entry Fee</span>
                      <span className="text-green fw-700">₹{event.entryFee}</span>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" className="btn btn-ghost w-full" onClick={() => setShowForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                      {submitting ? <InlineLoader /> : '✅ Register'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
