import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

const STATUS_BADGE = { Open:'badge-green', Active:'badge-blue', Full:'badge-orange', Closed:'badge-gray', Cancelled:'badge-red' };

export default function OwnerEvents() {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [regModal, setRegModal] = useState(null); // eventId
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();

  const load = () => {
    axios.get('/api/events/owner/list')
      .then(r => setEvents(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const cancelEvent = async (id) => {
    if (!confirm('Cancel this event?')) return;
    try {
      await axios.put(`/api/events/owner/${id}/cancel`);
      toast.success('Event cancelled');
      load();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const viewRegistrations = async (eventId) => {
    const r = await axios.get(`/api/events/owner/${eventId}/registrations`);
    setTeams(r.data.teams);
    setRegModal(eventId);
  };

  if (loading) return <Loader fullPage={false} />;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16 }}>
          <div>
            <h1>Event <span className="gradient-text">Management</span></h1>
            <p>Create and manage tournaments</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/owner/events/create')}>+ Create Event</button>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <div className="empty-title">No Events Yet</div>
            <div className="empty-desc">Create your first tournament!</div>
            <button className="btn btn-primary" onClick={() => navigate('/owner/events/create')}>Create Event</button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {events.map(ev => (
              <div key={ev._id} className="card animate-fade">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div className="fw-700" style={{ fontSize:'1.1rem', marginBottom:4 }}>{ev.name}</div>
                    <div className="text-muted text-sm">🏟️ {ev.venueName} · 📅 {ev.startDate} at {ev.eventTime}</div>
                    <div className="text-muted text-sm">🏆 Prize: {ev.prizePool||'TBD'} · 🎟 Entry: {ev.entryFee>0?`₹${ev.entryFee}`:'Free'}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <span className={`badge ${STATUS_BADGE[ev.status]||'badge-gray'}`}>{ev.status}</span>
                    <span className="text-muted text-sm">{ev.registeredTeamsCount}/{ev.maxTeams} teams</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => viewRegistrations(ev._id)}>👥 Teams ({ev.registeredTeamsCount})</button>
                  {ev.status !== 'Cancelled' && ev.status !== 'Active' && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/owner/events/${ev._id}/edit`)}>✏️ Edit</button>
                  )}
                  {!['Cancelled','Active'].includes(ev.status) && (
                    <button className="btn btn-danger btn-sm" onClick={() => cancelEvent(ev._id)}>🗑️ Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Registrations Modal */}
        {regModal && (
          <RegistrationsModal
            eventId={regModal}
            teams={teams}
            onClose={() => setRegModal(null)}
            onRefresh={() => viewRegistrations(regModal)}
          />
        )}
      </div>
    </div>
  );
}

// ── Registrations Modal (with offline registration) ───────────────────────────
function RegistrationsModal({ eventId, teams, onClose, onRefresh }) {
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    teamName: '', playerName: '', playerPhone: '', numberOfPlayers: 1, members: ''
  });

  const handleSubmit = async () => {
    if (!form.teamName.trim())   { toast.error('Team name is required'); return; }
    if (!form.playerName.trim()) { toast.error('Contact name is required'); return; }
    if (!form.numberOfPlayers || form.numberOfPlayers < 1) { toast.error('Enter valid player count'); return; }

    setSubmitting(true);
    try {
      await axios.post(`/api/events/owner/${eventId}/register-offline`, {
        teamName:        form.teamName.trim(),
        playerName:      form.playerName.trim(),
        playerPhone:     form.playerPhone.trim(),
        numberOfPlayers: parseInt(form.numberOfPlayers),
        members:         form.members
          ? form.members.split(',').map(m => m.trim()).filter(Boolean)
          : [],
      });
      toast.success('Team registered successfully! ✅');
      setForm({ teamName:'', playerName:'', playerPhone:'', numberOfPlayers:1, members:'' });
      setShowForm(false);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:560 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 className="modal-title" style={{ margin:0 }}>👥 Registered Teams</h3>
          <button
            className={`btn btn-sm ${showForm ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => setShowForm(s => !s)}
          >
            {showForm ? '✕ Cancel' : '➕ Register Offline Team'}
          </button>
        </div>

        {/* Offline registration form */}
        {showForm && (
          <div style={{
            background: 'rgba(0,200,100,0.07)',
            border: '1px solid rgba(0,200,100,0.25)',
            borderRadius: 12,
            padding: 18,
            marginBottom: 20,
          }}>
            <div className="fw-700" style={{ marginBottom:14, color:'var(--neon-green)' }}>
              📋 Offline / Walk-in Team Registration
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input className="form-input" placeholder="e.g. Thunder FC"
                  value={form.teamName}
                  onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">No. of Players *</label>
                <input className="form-input" type="number" min={1} max={50}
                  value={form.numberOfPlayers}
                  onChange={e => setForm(f => ({ ...f, numberOfPlayers: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Name *</label>
                <input className="form-input" placeholder="Team captain name"
                  value={form.playerName}
                  onChange={e => setForm(f => ({ ...f, playerName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" placeholder="+91 99999 99999"
                  value={form.playerPhone}
                  onChange={e => setForm(f => ({ ...f, playerPhone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:14 }}>
              <label className="form-label">Members (comma-separated, optional)</label>
              <input className="form-input" placeholder="Alice, Bob, Charlie..."
                value={form.members}
                onChange={e => setForm(f => ({ ...f, members: e.target.value }))} />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '⏳ Registering...' : '✅ Confirm Registration'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Team list */}
        {teams.length === 0 ? (
          <p className="text-muted">No teams registered yet</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:340, overflowY:'auto' }}>
            {teams.map((t, i) => (
              <div key={t._id} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 16px',
                background:'rgba(255,255,255,0.04)',
                borderRadius:10,
              }}>
                <div style={{
                  width:32, height:32,
                  background:'linear-gradient(135deg,var(--neon-purple),var(--neon-blue))',
                  borderRadius:'50%', display:'flex', alignItems:'center',
                  justifyContent:'center', fontWeight:700, fontSize:'0.8rem',
                  color:'#fff', flexShrink:0,
                }}>{i + 1}</div>
                <div style={{ flex:1 }}>
                  <div className="fw-700">{t.teamName}</div>
                  <div className="text-faint text-sm">
                    {t.playerName} · {t.numberOfPlayers} players · {t.paymentStatus}
                  </div>
                  {t.playerPhone && (
                    <div className="text-sm" style={{ color:'var(--neon-blue)', marginTop:2 }}>
                      📞 {t.playerPhone}
                    </div>
                  )}
                  {t.members?.length > 0 && (
                    <div className="text-faint text-sm" style={{ marginTop:2 }}>
                      👤 {t.members.join(', ')}
                    </div>
                  )}
                </div>
                {t.isOffline && (
                  <span className="badge badge-gray" style={{ marginLeft:'auto' }}>Walk-in</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
