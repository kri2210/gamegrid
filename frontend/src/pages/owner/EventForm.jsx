import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { InlineLoader } from '../../components/Loader';

export default function OwnerEventForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);
  const [venues, setVenues] = useState([]);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    venueId:'', name:'', description:'', prizePool:'', entryFee:'',
    facilities:'', maxTeams:'', startDate:'', endDate:'', eventTime:'09:00', lastRegistrationDate:''
  });

  useEffect(() => {
    axios.get('/api/owner/venues').then(r => {
      setVenues(r.data);
      if (r.data[0] && !isEdit) setForm(f => ({ ...f, venueId: r.data[0]._id }));
    });
    if (isEdit) {
      axios.get('/api/events/owner/list').then(r => {
        const ev = r.data.find(e => e._id === id);
        if (!ev) { navigate('/owner/events'); return; }
        setForm({
          venueId: ev.venueId, name: ev.name, description: ev.description||'',
          prizePool: ev.prizePool||'', entryFee: ev.entryFee||'',
          facilities: (ev.facilities||[]).join(', '), maxTeams: ev.maxTeams,
          startDate: ev.startDate, endDate: ev.endDate||'',
          eventTime: ev.eventTime, lastRegistrationDate: ev.lastRegistrationDate
        });
      });
    }
  }, [id]);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    if (!form.venueId || !form.name || !form.maxTeams || !form.startDate || !form.lastRegistrationDate)
      { toast.error('Please fill all required fields'); return; }

    setSaving(true);
    try {
      const payload = { ...form, entryFee: form.entryFee || 0 };
      if (isEdit) {
        await axios.put(`/api/events/owner/${id}`, payload);
        toast.success('Event updated!');
      } else {
        await axios.post('/api/events/owner/create', payload);
        toast.success('Event created!');
      }
      navigate('/owner/events');
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to save event');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-wrap">
      <div className="container" style={{ maxWidth:680 }}>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/owner/events')}>← Back</button>
          <h1>{isEdit ? 'Edit' : 'Create'} <span className="gradient-text">Event</span></h1>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <h3 style={{ marginBottom:16 }}>📋 Event Details</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Venue *</label>
                <select name="venueId" className="form-select" value={form.venueId} onChange={handle} required>
                  <option value="">Select venue</option>
                  {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input name="name" className="form-input" value={form.name} onChange={handle} required placeholder="Summer Cricket Cup 2026" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea name="description" className="form-textarea" value={form.description} onChange={handle} placeholder="Event details..." />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Prize Pool</label>
                  <input name="prizePool" className="form-input" value={form.prizePool} onChange={handle} placeholder="₹50,000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Entry Fee (₹)</label>
                  <input name="entryFee" type="number" className="form-input" value={form.entryFee} onChange={handle} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Facilities (comma-separated)</label>
                <input name="facilities" className="form-input" value={form.facilities} onChange={handle} placeholder="Dressing Room, Washrooms, Cafeteria" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Teams *</label>
                <input name="maxTeams" type="number" className="form-input" value={form.maxTeams} onChange={handle} required min={2} placeholder="16" />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom:16 }}>📅 Schedule</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input name="startDate" type="date" className="form-input" value={form.startDate} onChange={handle} required min={today} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input name="endDate" type="date" className="form-input" value={form.endDate} onChange={handle} min={form.startDate||today} />
              </div>
              <div className="form-group">
                <label className="form-label">Event Time</label>
                <input name="eventTime" type="time" className="form-input" value={form.eventTime} onChange={handle} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Registration Date *</label>
                <input name="lastRegistrationDate" type="date" className="form-input" value={form.lastRegistrationDate} onChange={handle} required min={today} max={form.startDate} />
                <div className="form-hint">Must be before start date</div>
              </div>
            </div>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <button type="button" className="btn btn-ghost w-full" onClick={() => navigate('/owner/events')}>Cancel</button>
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? <InlineLoader /> : (isEdit ? '✅ Update Event' : '🏆 Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
