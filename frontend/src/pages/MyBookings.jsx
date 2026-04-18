import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

const STATUS_BADGE = {
  Confirmed:  'badge-green',
  Cancelled:  'badge-red',
  Completed:  'badge-blue',
};

function isSlotPast(booking) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowH  = now.getHours();
  const nowM  = now.getMinutes();

  if (booking.date < today) return true;
  if (booking.date === today) {
    const allEnded = (booking.slotDetails || []).every(sl => {
      const [h, m] = sl.endTime.split(':').map(Number);
      return h < nowH || (h === nowH && m <= nowM);
    });
    return allEnded;
  }
  return false;
}

export default function MyBookings() {
  const [bookings, setBookings]           = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [mainTab, setMainTab]             = useState('bookings');
  const [bookingTab, setBookingTab]       = useState('upcoming');

  const load = async () => {
    setLoading(true);
    try {
      const [br, er] = await Promise.all([
        axios.get('/api/bookings'),
        axios.get('/api/events/my/registrations'),
      ]);
      setBookings(br.data);
      setRegistrations(er.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const cancelBooking = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await axios.put(`/api/bookings/${id}/cancel`);
      toast.success('Booking cancelled');
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const cancelRegistration = async (eventId) => {
    if (!confirm('Cancel your event registration?')) return;
    try {
      await axios.delete(`/api/events/${eventId}/cancel-registration`);
      toast.success('Registration cancelled');
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return <Loader fullPage={false} />;

  const activeBookings    = bookings.filter(b => b.status !== 'Cancelled');
  const upcomingBookings  = activeBookings.filter(b => !isSlotPast(b));
  const pastBookings      = activeBookings.filter(b =>  isSlotPast(b));
  const cancelledBookings = bookings.filter(b => b.status === 'Cancelled');
  const pastTabBookings   = [...pastBookings, ...cancelledBookings].sort((a,b) => new Date(b.date) - new Date(a.date));
  const shownBookings     = bookingTab === 'upcoming' ? upcomingBookings : pastTabBookings;

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header">
          <h1>My <span className="gradient-text">Activity</span></h1>
          <p>View and manage your bookings and event registrations</p>
        </div>

        {/* Main tab */}
        <div style={{ display:'flex', gap:8, marginBottom:24, background:'rgba(255,255,255,0.04)', borderRadius:12, padding:4, width:'fit-content' }}>
          {['bookings','events'].map(t => (
            <button key={t} className={`btn btn-sm ${mainTab===t?'btn-primary':'btn-ghost'}`}
              style={{ borderRadius:10 }} onClick={() => setMainTab(t)}>
              {t === 'bookings' ? '📋 Bookings' : '🏆 Events'}
            </button>
          ))}
        </div>

        {mainTab === 'bookings' ? (
          <>
            {/* Upcoming / Past sub-tabs */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              <button
                className={`btn btn-sm ${bookingTab==='upcoming'?'btn-outline':'btn-ghost'}`}
                style={{ borderRadius:10 }}
                onClick={() => setBookingTab('upcoming')}>
                🕐 Upcoming
                {upcomingBookings.length > 0 && (
                  <span className="badge badge-green" style={{ marginLeft:6, fontSize:'0.7rem' }}>{upcomingBookings.length}</span>
                )}
              </button>
              <button
                className={`btn btn-sm ${bookingTab==='past'?'btn-outline':'btn-ghost'}`}
                style={{ borderRadius:10 }}
                onClick={() => setBookingTab('past')}>
                📁 Past
                {pastTabBookings.length > 0 && (
                  <span className="badge badge-gray" style={{ marginLeft:6, fontSize:'0.7rem' }}>{pastTabBookings.length}</span>
                )}
              </button>
            </div>

            {shownBookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{bookingTab === 'upcoming' ? '📋' : '📁'}</div>
                <div className="empty-title">{bookingTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}</div>
                <div className="empty-desc">{bookingTab === 'upcoming' ? 'Book a venue to get started!' : 'Your completed bookings will appear here.'}</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                {shownBookings.map(b => (
                  <div key={b._id} className="card animate-fade" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                      <div>
                        <div className="fw-700" style={{ fontSize:'1.05rem' }}>{b.venueName}</div>
                        <div className="text-muted text-sm">🏅 {b.sport} &nbsp;|&nbsp; 📅 {b.date}</div>
                      </div>
                      <span className={`badge ${STATUS_BADGE[b.status] || 'badge-gray'}`}>
                        {b.status === 'Confirmed' && isSlotPast(b) ? 'Completed' : b.status}
                      </span>
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {b.slotDetails?.map((sl,i) => (
                        <span key={i} className="badge badge-blue">{sl.startTime}–{sl.endTime}</span>
                      ))}
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                      <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:'0.85rem', color:'var(--text-2)' }}>
                        <span>💳 {b.paymentMethod} · {b.paymentStatus}</span>
                        <span className="text-green fw-700">₹{b.totalAmount}</span>
                      </div>
                      {bookingTab === 'upcoming' && b.status === 'Confirmed' && !isSlotPast(b) && (
                        <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b._id)}>Cancel</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          registrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏆</div>
              <div className="empty-title">No Event Registrations</div>
              <div className="empty-desc">Join an event to compete!</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {registrations.map(r => (
                <div key={r._id} className="card animate-fade">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                    <div>
                      <div className="fw-700" style={{ fontSize:'1.05rem' }}>{r.event?.name || 'Event'}</div>
                      <div className="text-muted text-sm">🏟️ {r.event?.venueName} &nbsp;|&nbsp; 📅 {r.event?.startDate}</div>
                    </div>
                    <span className={`badge ${r.paymentStatus==='Paid'?'badge-green':'badge-orange'}`}>{r.paymentStatus}</span>
                  </div>
                  <div style={{ marginTop:8 }}>
                    <span className="badge badge-purple">👥 Team: {r.teamName}</span>
                    <span className="text-muted text-sm" style={{ marginLeft:12 }}>{r.numberOfPlayers} players</span>
                  </div>
                  {r.event?.status && !['Cancelled','Closed','Active'].includes(r.event.status) && (
                    <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end' }}>
                      <button className="btn btn-danger btn-sm" onClick={() => cancelRegistration(r.eventId)}>
                        Cancel Registration
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
