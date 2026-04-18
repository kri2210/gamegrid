import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

export default function OwnerSlots() {
  const [venues,   setVenues]   = useState([]);
  const [slots,    setSlots]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sloading, setSloading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [sel, setSel] = useState({ venueId:'', date: today, sport:'' });

  // Manual booking state
  const [showManual,  setShowManual]  = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [manualForm,  setManualForm]  = useState({ playerName:'', playerPhone:'', playerCount:1 });
  const [mbLoading,   setMbLoading]   = useState(false);

  // Day-off state
  const [isDayOff,    setIsDayOff]    = useState(false);
  const [dayOffReason,setDayOffReason]= useState('');
  const [dayOffInput, setDayOffInput] = useState('');
  const [dayOffLoading,setDayOffLoading]=useState(false);
  const [showDayOffForm,setShowDayOffForm]=useState(false);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  useEffect(() => {
    axios.get('/api/owner/venues')
      .then(r => {
        setVenues(r.data);
        if (r.data[0]) setSel(s => ({ ...s, venueId: r.data[0]._id, sport: r.data[0].sports?.[0] || '' }));
      })
      .finally(() => setLoading(false));
  }, []);

  const loadSlots = async () => {
    if (!sel.venueId || !sel.date || !sel.sport) return;
    setSloading(true);
    setSelectedIds([]);
    setShowManual(false);
    setSlotsLoaded(false);
    setIsDayOff(false);

    try {
      // Check day-off status first
      const dayoffsRes = await axios.get(`/api/owner/venues/${sel.venueId}/dayoffs`);
      const match = dayoffsRes.data.find(d => d.sport === sel.sport && d.date === sel.date);
      if (match) {
        setIsDayOff(true);
        setDayOffReason(match.reason || '');
        setSlots([]);
        setSlotsLoaded(true);
        setSloading(false);
        return;
      }

      const r = await axios.get('/api/owner/slots', { params: sel });
      setSlots(r.data);
      setSlotsLoaded(true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed');
      setSlots([]);
    } finally {
      setSloading(false);
    }
  };

  const toggleBlock = async (slotId) => {
    try {
      await axios.put(`/api/owner/slots/${slotId}/block`);
      setSlots(slots.map(s => s._id === slotId ? { ...s, isBlocked: !s.isBlocked } : s));
    } catch (e) { toast.error('Failed to toggle slot'); }
  };

  const toggleSelect = (slotId) => {
    setSelectedIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const submitManualBooking = async () => {
    if (selectedIds.length === 0) { toast.error('Select at least one slot'); return; }
    if (!manualForm.playerName) { toast.error('Player name is required'); return; }
    setMbLoading(true);
    try {
      await axios.post('/api/owner/bookings/manual', {
        venueId:     sel.venueId,
        sport:       sel.sport,
        slotIds:     selectedIds,
        playerName:  manualForm.playerName,
        playerPhone: manualForm.playerPhone,
        playerCount: manualForm.playerCount,
      });
      toast.success('Manual booking created successfully!');
      setShowManual(false);
      setSelectedIds([]);
      setManualForm({ playerName:'', playerPhone:'', playerCount:1 });
      loadSlots();
    } catch (e) { toast.error(e.response?.data?.error || 'Booking failed'); }
    finally { setMbLoading(false); }
  };

  const markDayOff = async () => {
    setDayOffLoading(true);
    try {
      await axios.post(`/api/owner/venues/${sel.venueId}/dayoff`, {
        sport:  sel.sport,
        date:   sel.date,
        reason: dayOffInput.trim(),
      });
      toast.success(`Day off marked for ${sel.sport} on ${sel.date} 🚫`);
      setIsDayOff(true);
      setDayOffReason(dayOffInput.trim());
      setShowDayOffForm(false);
      setDayOffInput('');
      setSlots([]);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to mark day off');
    } finally { setDayOffLoading(false); }
  };

  const removeDayOff = async () => {
    if (!confirm(`Re-open ${sel.sport} on ${sel.date}?`)) return;
    setDayOffLoading(true);
    try {
      await axios.delete(`/api/owner/venues/${sel.venueId}/dayoff`, {
        data: { sport: sel.sport, date: sel.date },
      });
      toast.success('Day off removed — venue re-opened ✅');
      setIsDayOff(false);
      setDayOffReason('');
      setSlots([]);
      setSlotsLoaded(false);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to remove day off');
    } finally { setDayOffLoading(false); }
  };

  const selectedVenue  = venues.find(v => v._id === sel.venueId);
  const availableSlots = slots.filter(s => !s.isBooked && !s.isBlocked);
  const selectedSlots  = slots.filter(s => selectedIds.includes(s._id));
  const totalAmount    = selectedSlots.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1>Slot <span className="gradient-text">Management</span></h1>
            <p>Block/unblock time slots, create manual bookings, or mark a day off</p>
          </div>
          {slotsLoaded && !isDayOff && slots.length > 0 && availableSlots.length > 0 && (
            <button className="btn btn-primary" onClick={() => { setShowManual(s => !s); setSelectedIds([]); }}>
              {showManual ? '✕ Close Booking' : '➕ Manual Booking'}
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="filter-bar mb-6">
          <div className="form-group">
            <label className="form-label">Venue</label>
            <select className="form-select" value={sel.venueId}
              onChange={e => setSel(s => ({ ...s, venueId:e.target.value, sport: venues.find(v=>v._id===e.target.value)?.sports?.[0]||'' }))}>
              {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={sel.date} min={today}
              onChange={e => setSel(s => ({ ...s, date:e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Sport</label>
            <select className="form-select" value={sel.sport}
              onChange={e => setSel(s => ({ ...s, sport:e.target.value }))}>
              {selectedVenue?.sports?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{ alignSelf:'flex-end' }} onClick={loadSlots} disabled={sloading}>
            {sloading ? '...' : '🔍 Load Slots'}
          </button>
        </div>

        {/* Day-off banner / toggle — only show after slots are loaded */}
        {slotsLoaded && (
          isDayOff ? (
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
              padding:'16px 20px', marginBottom:20,
              background:'rgba(255,60,60,0.08)',
              border:'1px solid rgba(255,60,60,0.3)',
              borderRadius:12,
            }}>
              <div>
                <div className="fw-700" style={{ color:'#ff6b6b', marginBottom:4 }}>🚫 Day Off — Venue Closed</div>
                <div className="text-sm text-muted">
                  {sel.sport} is marked closed for {sel.date}.
                  {dayOffReason && <> Reason: <em>{dayOffReason}</em></>}
                </div>
              </div>
              <button
                className="btn btn-outline btn-sm"
                style={{ borderColor:'var(--neon-green)', color:'var(--neon-green)' }}
                onClick={removeDayOff}
                disabled={dayOffLoading}
              >
                {dayOffLoading ? '⏳ ...' : '✅ Re-open This Day'}
              </button>
            </div>
          ) : (
            <div style={{ marginBottom:20 }}>
              {!showDayOffForm ? (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ borderColor:'rgba(255,100,100,0.4)', color:'#ff8080' }}
                  onClick={() => setShowDayOffForm(true)}
                >
                  🚫 Mark Day Off for {sel.sport} on {sel.date}
                </button>
              ) : (
                <div style={{
                  display:'flex', gap:10, alignItems:'center', flexWrap:'wrap',
                  padding:'14px 18px',
                  background:'rgba(255,60,60,0.06)',
                  border:'1px solid rgba(255,60,60,0.2)',
                  borderRadius:12,
                }}>
                  <span className="text-sm fw-700" style={{ color:'#ff8080' }}>🚫 Mark Day Off</span>
                  <input
                    className="form-input"
                    style={{ flex:1, minWidth:160 }}
                    placeholder="Reason (optional, e.g. maintenance)"
                    value={dayOffInput}
                    onChange={e => setDayOffInput(e.target.value)}
                  />
                  <button className="btn btn-danger btn-sm" onClick={markDayOff} disabled={dayOffLoading}>
                    {dayOffLoading ? '⏳...' : 'Confirm'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowDayOffForm(false)}>Cancel</button>
                </div>
              )}
            </div>
          )
        )}

        {/* Legend */}
        <div style={{ display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' }}>
          <span><span className="badge badge-green">●</span> Available</span>
          <span><span className="badge badge-red">●</span> Booked</span>
          <span><span className="badge badge-gray">●</span> Blocked</span>
          <span><span className="badge badge-orange">●</span> Peak</span>
          {showManual && <span><span className="badge badge-purple">●</span> Selected for booking</span>}
        </div>

        {loading ? <Loader fullPage={false} /> : sloading ? <div className="loader-wrap"><div className="loader"/></div>
        : !slotsLoaded ? (
          <div className="empty-state">
            <div className="empty-icon">🕐</div>
            <div className="empty-title">No Slots Loaded</div>
            <div className="empty-desc">Select venue, date and sport then click Load Slots</div>
          </div>
        ) : isDayOff ? null : slots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🕐</div>
            <div className="empty-title">No Slots Found</div>
            <div className="empty-desc">No slots available for the selected filters</div>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="slot-grid">
                {slots.map(slot => {
                  const isSelected = selectedIds.includes(slot._id);
                  const canSelect  = showManual && !slot.isBooked && !slot.isBlocked;
                  let cls = slot.isBooked ? 'booked' : slot.isBlocked ? 'blocked' : '';
                  if (isSelected) cls = 'selected';

                  return (
                    <div key={slot._id}>
                      <button
                        className={`slot-btn ${cls}`}
                        style={{
                          width:'100%',
                          outline: isSelected ? '2px solid var(--green)' : undefined,
                          background: isSelected ? 'rgba(0,200,100,0.15)' : undefined,
                        }}
                        onClick={() => {
                          if (showManual && canSelect) { toggleSelect(slot._id); return; }
                          if (!showManual && !slot.isBooked) toggleBlock(slot._id);
                        }}
                        disabled={slot.isBooked && !showManual}
                        title={
                          showManual
                            ? (slot.isBooked ? 'Already booked' : slot.isBlocked ? 'Slot is blocked' : isSelected ? 'Click to deselect' : 'Click to select')
                            : (slot.isBooked ? 'Already booked' : slot.isBlocked ? 'Click to unblock' : 'Click to block')
                        }>
                        <div>{slot.startTime}–{slot.endTime}</div>
                        <div className="slot-price">₹{slot.price}{slot.isPeak ? ' 🔥':''}</div>
                        <div style={{ fontSize:'0.65rem', marginTop:2 }}>
                          {isSelected ? '✅ Selected' : slot.isBooked ? '🔴 Booked' : slot.isBlocked ? '⛔ Blocked' : '🟢 Free'}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Manual booking form */}
            {showManual && (
              <div className="card" style={{ marginTop:24, borderColor:'var(--green)', borderWidth:1, borderStyle:'solid' }}>
                <h3 style={{ marginBottom:16 }}>📋 Manual / Walk-in Booking</h3>

                {selectedIds.length > 0 && (
                  <div style={{ marginBottom:16, padding:'10px 14px', background:'rgba(0,200,100,0.08)', borderRadius:8 }}>
                    <div className="text-sm fw-700" style={{ marginBottom:6 }}>Selected Slots:</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {selectedSlots.map(s => (
                        <span key={s._id} className="badge badge-green">{s.startTime}–{s.endTime} (₹{s.price})</span>
                      ))}
                    </div>
                    <div className="fw-700 text-green" style={{ marginTop:8 }}>Total: ₹{totalAmount}</div>
                  </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:16 }}>
                  <div className="form-group">
                    <label className="form-label">Player Name *</label>
                    <input className="form-input" placeholder="Walk-in player name"
                      value={manualForm.playerName}
                      onChange={e => setManualForm(f => ({ ...f, playerName:e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" type="tel" placeholder="+91 99999 99999"
                      value={manualForm.playerPhone}
                      onChange={e => setManualForm(f => ({ ...f, playerPhone:e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Player Count</label>
                    <input className="form-input" type="number" min={1} max={20}
                      value={manualForm.playerCount}
                      onChange={e => setManualForm(f => ({ ...f, playerCount:parseInt(e.target.value)||1 }))} />
                  </div>
                </div>

                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <button className="btn btn-primary" onClick={submitManualBooking} disabled={mbLoading || selectedIds.length === 0}>
                    {mbLoading ? '⏳ Booking...' : `✅ Confirm Booking${selectedIds.length > 0 ? ` (₹${totalAmount})` : ''}`}
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setShowManual(false); setSelectedIds([]); }}>
                    Cancel
                  </button>
                </div>
                {selectedIds.length === 0 && (
                  <p className="text-muted text-sm" style={{ marginTop:10 }}>☝️ Click on available slots above to select them for booking.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
