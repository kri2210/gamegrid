import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader, { InlineLoader } from '../components/Loader';
import { useAuth } from '../context/AuthContext';

/* ─── Payment options (3 methods) ──────────────────────────────────────────── */
const PAYMENT_OPTIONS = [
  { value: 'online', icon: '💳', label: 'Pay Online',     desc: 'Cards, NetBanking, Wallets' },
  { value: 'upi',    icon: '📲', label: 'UPI',            desc: 'Scan QR or enter UPI ID' },
  { value: 'cash',   icon: '💵', label: 'Cash at Venue',  desc: 'Pay when you arrive' },
];

/* ─── Razorpay script loader ─────────────────────────────────────────────── */
function loadRazorpayScript() {
  return new Promise(resolve => {
    if (document.getElementById('razorpay-sdk')) { resolve(true); return; }
    const script = document.createElement('script');
    script.id  = 'razorpay-sdk';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function VenueDetail() {
  const { id }      = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [venue,        setVenue]        = useState(null);
  const [slots,        setSlots]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking,      setBooking]      = useState(false);
  const [dayOffInfo,   setDayOffInfo]   = useState(null);

  const today   = new Date().toISOString().split('T')[0];
  const maxDate  = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();
  const [selectedSport,  setSelectedSport]  = useState('');
  const [selectedDate,   setSelectedDate]   = useState(today);
  const [selectedSlots,  setSelectedSlots]  = useState([]);
  const [paymentMethod,  setPaymentMethod]  = useState('online');
  const [playerName,     setPlayerName]     = useState(user?.name || '');
  const [playerPhone,    setPlayerPhone]    = useState(user?.phone || '');
  const [playerCount,    setPlayerCount]    = useState(1);
  const [upiId,          setUpiId]          = useState('');

  /* ── Fetch venue ── */
  useEffect(() => {
    axios.get(`/api/venues/${id}`)
      .then(r => { setVenue(r.data); setSelectedSport(r.data.sports?.[0] || ''); })
      .catch(() => navigate('/explore'))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Fetch slots ── */
  useEffect(() => {
    if (!venue || !selectedSport || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlots([]);
    setDayOffInfo(null);
    axios.get(`/api/venues/${id}/slots`, { params: { date: selectedDate, sport: selectedSport } })
      .then(r => {
        if (r.data.closed) { setDayOffInfo({ reason: r.data.reason }); setSlots([]); }
        else setSlots(r.data);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [venue, selectedSport, selectedDate]);

  const toggleSlot = slot => {
    if (slot.isBooked || slot.isBlocked) return;
    setSelectedSlots(prev =>
      prev.find(s => s._id === slot._id)
        ? prev.filter(s => s._id !== slot._id)
        : [...prev, slot]
    );
  };

  const totalAmount = selectedSlots.reduce((s, sl) => s + sl.price, 0);

  /* ─────────────────────────────────────────────────────────────
     BOOK — dispatches to correct payment flow
  ───────────────────────────────────────────────────────────── */
  const handleBook = async () => {
    if (!selectedSlots.length) { toast.error('Please select at least one slot'); return; }
    if (!playerName.trim())    { toast.error('Please enter your name'); return; }
    if (!playerPhone.trim())   { toast.error('Please enter your phone number'); return; }

    if (paymentMethod === 'online') { await handleRazorpay(); return; }
    if (paymentMethod === 'upi')    { await handleUpi();      return; }
    if (paymentMethod === 'cash')   { await handleCash();     return; }
  };

  /* ── Online via Razorpay ── */
  const handleRazorpay = async () => {
    setBooking(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error('Failed to load payment SDK. Check your connection.'); return; }

      const { data } = await axios.post('/api/payments/create-order', {
        venueId:     id,
        sport:       selectedSport,
        slotIds:     selectedSlots.map(s => s._id),
        playerName,
        playerPhone,
        playerCount,
      });

      const options = {
        key:         data.keyId,
        amount:      data.amount * 100,
        currency:    data.currency,
        name:        venue.name,
        description: `${selectedSport} — ${selectedSlots.length} slot(s)`,
        order_id:    data.orderId,
        prefill: {
          name:    data.prefillName,
          email:   data.prefillEmail,
          contact: data.prefillPhone,
        },
        theme: { color: '#00ff88' },
        modal: {
          ondismiss: () => {
            toast('Payment cancelled', { icon: '❌' });
            setBooking(false);
          },
        },
        handler: async (response) => {
          try {
            await axios.post('/api/payments/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              venueId:     id,
              sport:       selectedSport,
              slotIds:     selectedSlots.map(s => s._id),
              playerName,
              playerPhone,
              playerCount,
            });
            toast.success('Payment successful! Booking confirmed 🎉');
            navigate('/my-bookings');
          } catch (err) {
            toast.error(err.response?.data?.error || 'Payment verification failed');
            setBooking(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate payment');
      setBooking(false);
    }
  };

  /* ── UPI manual (QR / UPI ID) ── */
  const handleUpi = async () => {
    if (!upiId.trim()) { toast.error('Please enter your UPI ID or confirm the QR payment'); return; }
    setBooking(true);
    try {
      await axios.post('/api/bookings', {
        venueId:       id,
        sport:         selectedSport,
        slotIds:       selectedSlots.map(s => s._id),
        playerName,
        playerPhone,
        playerCount,
        paymentMethod: 'upi',
        upiId,
      });
      toast.success('Booking confirmed! 🎉 Payment will be verified by the venue.');
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  /* ── Cash at venue ── */
  const handleCash = async () => {
    setBooking(true);
    try {
      await axios.post('/api/bookings', {
        venueId:       id,
        sport:         selectedSport,
        slotIds:       selectedSlots.map(s => s._id),
        playerName,
        playerPhone,
        playerCount,
        paymentMethod: 'cash',
      });
      toast.success('Booking confirmed! Pay cash at the venue 💵');
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <Loader />;
  if (!venue)  return null;

  return (
    <div className="page-wrap">
      <div className="container">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:32, marginTop:24 }}>

          {/* ── Left: Venue Info ── */}
          <div>
            <div style={{ borderRadius:'var(--radius)', overflow:'hidden', height:280, background:'rgba(0,255,136,0.05)', marginBottom:24 }}>
              <img src={`/api/venues/${id}/image`} alt={venue.name}
                style={{ width:'100%', height:'100%', objectFit:'cover' }}
                onError={e => { e.target.style.display='none'; }}
              />
            </div>

            <h1 style={{ marginBottom:8 }}>{venue.name}</h1>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:16 }}>
              <span className="text-muted">📍 {venue.locality ? `${venue.locality}, ` : ''}{venue.address}, {venue.city}</span>
              {venue.rating > 0 && <span className="text-orange fw-700">⭐ {venue.rating}</span>}
            </div>

            {venue.locationUrl && (
              <div style={{ marginBottom:16 }}>
                <a href={venue.locationUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  🗺️ View on Google Maps
                </a>
              </div>
            )}

            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
              {venue.sports?.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
            </div>

            {venue.description && <p style={{ marginBottom:16 }}>{venue.description}</p>}

            {venue.amenities?.length > 0 && (
              <div style={{ marginBottom:16 }}>
                <div className="text-sm fw-700 mb-4" style={{ color:'var(--text-2)' }}>AMENITIES</div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {venue.amenities.map(a => <span key={a} className="badge badge-gray">{a}</span>)}
                </div>
              </div>
            )}

            <div className="card card-sm mt-4" style={{ marginBottom:24 }}>
              <div className="fw-700 mb-4">Pricing</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
                {venue.sports?.map(sport => {
                  const p = venue.pricing?.[sport] || { base:500, peak:800 };
                  return (
                    <div key={sport} style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, padding:12 }}>
                      <div className="text-sm fw-700">{sport}</div>
                      <div className="text-green fw-800" style={{ fontSize:'1.1rem' }}>₹{p.base}/hr</div>
                      <div className="text-faint" style={{ fontSize:'0.75rem' }}>Peak: ₹{p.peak}/hr</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: Booking Panel ── */}
          <div className="card" style={{ position:'sticky', top:90, alignSelf:'start', height:'fit-content' }}>
            <h3 style={{ marginBottom:20 }}>📅 Book a Slot</h3>

            {/* Sport */}
            <div className="form-group mb-4">
              <label className="form-label">Sport</label>
              <select className="form-select" value={selectedSport} onChange={e => setSelectedSport(e.target.value)}>
                {venue.sports?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Date */}
            <div className="form-group mb-4">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={selectedDate} min={today} max={maxDate}
                onChange={e => setSelectedDate(e.target.value)} />
              <div style={{ fontSize:'0.7rem', color:'var(--text-3)', marginTop:4 }}>Slots available up to 7 days ahead</div>
            </div>

            {/* Slots */}
            <div style={{ marginBottom:16 }}>
              <label className="form-label" style={{ display:'block', marginBottom:8 }}>Available Time Slots</label>
              {slotsLoading
                ? <div className="flex-center" style={{ padding:'20px 0' }}><div className="loader loader-sm"/></div>
                : dayOffInfo
                  ? (
                    <div style={{ padding:'18px 16px', background:'rgba(255,60,60,0.08)', border:'1px solid rgba(255,60,60,0.3)', borderRadius:12, textAlign:'center' }}>
                      <div style={{ fontSize:'2rem', marginBottom:8 }}>🚫</div>
                      <div className="fw-700" style={{ color:'#ff6b6b', marginBottom:4 }}>Venue Closed</div>
                      <div className="text-sm text-muted">{selectedSport} is not available on {selectedDate}.</div>
                      {dayOffInfo.reason && <div className="text-sm" style={{ marginTop:6, color:'rgba(255,255,255,0.5)' }}>{dayOffInfo.reason}</div>}
                      <div className="text-faint text-sm" style={{ marginTop:10 }}>Please select a different date or sport.</div>
                    </div>
                  )
                  : slots.length === 0
                    ? <div className="text-faint text-sm">No slots available for this date/sport</div>
                    : (
                      <div className="slot-grid">
                        {slots.map(slot => {
                          const sel = selectedSlots.find(s => s._id === slot._id);
                          const cls = slot.isBooked ? 'booked' : slot.isBlocked ? 'blocked' : sel ? 'selected' : '';
                          return (
                            <button key={slot._id} className={`slot-btn ${cls}`} onClick={() => toggleSlot(slot)}
                              disabled={slot.isBooked || slot.isBlocked}>
                              <div>{slot.startTime}–{slot.endTime}</div>
                              <div className="slot-price">₹{slot.price}{slot.isPeak ? ' 🔥' : ''}</div>
                            </button>
                          );
                        })}
                      </div>
                    )
              }
            </div>

            {/* ── Booking Form (shows when slots selected) ── */}
            {selectedSlots.length > 0 && (
              <>
                <hr className="divider" />
                <div className="form-group mb-4">
                  <label className="form-label">Your Name</label>
                  <input className="form-input" value={playerName} onChange={e => setPlayerName(e.target.value)} />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={playerPhone} onChange={e => setPlayerPhone(e.target.value)} />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">No. of Players</label>
                  <input type="number" className="form-input" min={1} value={playerCount} onChange={e => setPlayerCount(e.target.value)} />
                </div>

                {/* ── Payment Method ── */}
                <label className="form-label" style={{ display:'block', marginBottom:10 }}>Payment Method</label>
                <div className="payment-options" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:16 }}>
                  {PAYMENT_OPTIONS.map(opt => (
                    <div key={opt.value}
                      className={`payment-opt${paymentMethod === opt.value ? ' selected' : ''}`}
                      onClick={() => setPaymentMethod(opt.value)}
                      style={{ padding:'12px 8px' }}>
                      <div className="payment-opt-icon">{opt.icon}</div>
                      <div className="payment-opt-label">{opt.label}</div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-3)', marginTop:2 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>

                {/* ── UPI Panel ── */}
                {paymentMethod === 'upi' && (
                  <div style={{
                    background: 'rgba(0,207,255,0.06)',
                    border: '1px solid rgba(0,207,255,0.2)',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--neon-blue)', marginBottom:12, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      Scan QR Code to Pay
                    </div>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:12 }}>
                      <img
                        src="/upi-qr.png"
                        alt="UPI QR Code"
                        style={{
                          width: 160,
                          height: 160,
                          borderRadius: 10,
                          objectFit: 'cover',
                          border: '2px solid rgba(0,207,255,0.3)',
                          background: '#fff',
                        }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-3)', marginBottom:12 }}>
                      Amount: <strong style={{ color:'var(--neon-green)' }}>₹{totalAmount}</strong>
                    </div>
                    <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:12, marginBottom:0, textAlign:'left' }}>
                      <label className="form-label" style={{ marginBottom:6 }}>Or enter your UPI ID</label>
                      <input
                        className="form-input"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={e => setUpiId(e.target.value)}
                        style={{ fontSize:'0.9rem' }}
                      />
                      <div style={{ fontSize:'0.7rem', color:'var(--text-3)', marginTop:6 }}>
                        Enter the UPI ID used for payment. The venue will verify it.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Cash Panel ── */}
                {paymentMethod === 'cash' && (
                  <div style={{
                    background: 'rgba(255,122,0,0.06)',
                    border: '1px solid rgba(255,122,0,0.2)',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ fontSize:'1.6rem', flexShrink:0 }}>💵</div>
                    <div>
                      <div style={{ fontWeight:700, marginBottom:4, color:'var(--neon-orange)' }}>Pay at Venue</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>
                        Bring <strong style={{ color:'var(--text-1)' }}>₹{totalAmount}</strong> in cash when you arrive.
                        Your slot is reserved but payment is due on-site.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Online info note ── */}
                {paymentMethod === 'online' && (
                  <div style={{
                    background: 'rgba(0,255,136,0.06)',
                    border: '1px solid rgba(0,255,136,0.2)',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{ fontSize:'1.6rem', flexShrink:0 }}>🔒</div>
                    <div>
                      <div style={{ fontWeight:700, marginBottom:4, color:'var(--neon-green)' }}>Secure Online Payment</div>
                      <div style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>
                        You'll be redirected to Razorpay. Pay <strong style={{ color:'var(--text-1)' }}>₹{totalAmount}</strong> via card, net banking, or wallet.
                        Booking confirms instantly after payment.
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Total & CTA ── */}
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                  <span className="text-muted">Total ({selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''})</span>
                  <span className="text-green fw-800" style={{ fontSize:'1.2rem' }}>₹{totalAmount}</span>
                </div>

                <button
                  id="btn-confirm-booking"
                  className="btn btn-primary w-full"
                  onClick={handleBook}
                  disabled={booking}
                  style={{ fontSize:'0.95rem', padding:'14px' }}
                >
                  {booking
                    ? <InlineLoader />
                    : paymentMethod === 'online'
                      ? '💳 Pay ₹' + totalAmount + ' Now'
                      : paymentMethod === 'upi'
                        ? '📲 Confirm UPI Booking'
                        : '💵 Confirm Cash Booking'
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
