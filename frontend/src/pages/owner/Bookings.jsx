import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

const STATUS_OPTIONS = ['Confirmed','Completed','Cancelled'];

function isBookingPast(b) {
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  const nowH  = now.getHours();
  const nowM  = now.getMinutes();
  if (b.date < today) return true;
  if (b.date === today) {
    return (b.slotDetails || []).every(sl => {
      const [h, m] = sl.endTime.split(':').map(Number);
      return h < nowH || (h === nowH && m <= nowM);
    });
  }
  return false;
}

function effectiveStatus(b) {
  if (b.status === 'Cancelled') return 'Cancelled';
  if (b.status === 'Completed' || isBookingPast(b)) return 'Completed';
  return 'Confirmed';
}

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filters,  setFilters]  = useState({ date:'', sport:'', status:'' });

  const load = async () => {
    setLoading(true);
    const params = {};
    if (filters.date)   params.date   = filters.date;
    if (filters.sport)  params.sport  = filters.sport;
    if (filters.status) params.status = filters.status;
    try {
      const r = await axios.get('/api/owner/bookings', { params });
      setBookings(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const cancelBooking = async (id) => {
    if (!confirm('Cancel this booking? This will free up the slots.')) return;
    try {
      await axios.put(`/api/owner/bookings/${id}/status`, { status: 'Cancelled' });
      toast.success('Booking cancelled');
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const BADGE = { Confirmed:'badge-green', Completed:'badge-blue', Cancelled:'badge-red' };

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header">
          <h1>Booking <span className="gradient-text">Management</span></h1>
          <p>Bookings are automatically marked Completed when the slot time passes.</p>
        </div>

        {/* Filters */}
        <div className="filter-bar mb-6">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" className="form-input" value={filters.date}
              onChange={e => setFilters(f => ({ ...f, date:e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Sport</label>
            <select className="form-select" value={filters.sport}
              onChange={e => setFilters(f => ({ ...f, sport:e.target.value }))}>
              <option value="">All Sports</option>
              {['Box Cricket','Badminton','Tennis','Football'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status:e.target.value }))}>
              <option value="">All</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost" style={{ alignSelf:'flex-end' }}
            onClick={() => setFilters({ date:'', sport:'', status:'' })}>Reset</button>
        </div>

        {loading ? <Loader fullPage={false}/> : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-title">No Bookings Found</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th><th>Phone</th><th>Venue</th><th>Sport</th><th>Date</th>
                  <th>Slots</th><th>Amount</th><th>Payment</th><th>Type</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const status = effectiveStatus(b);
                  return (
                    <tr key={b._id}>
                      <td>
                        <div className="fw-700" style={{ fontSize:'0.875rem' }}>{b.playerName}</div>
                      </td>
                      <td>
                        <div className="text-sm" style={{ color:'var(--text-2)' }}>
                          {b.playerPhone || <span className="text-faint">—</span>}
                        </div>
                      </td>
                      <td className="text-sm">{b.venueName}</td>
                      <td><span className="badge badge-blue">{b.sport}</span></td>
                      <td className="text-sm">{b.date}</td>
                      <td>
                        {b.slotDetails?.map((sl,i) => (
                          <div key={i} className="text-sm" style={{ whiteSpace:'nowrap' }}>{sl.startTime}–{sl.endTime}</div>
                        ))}
                      </td>
                      <td><span className="text-green fw-700">₹{b.totalAmount}</span></td>
                      <td><span className="text-sm">{b.paymentMethod} · {b.paymentStatus}</span></td>
                      <td>
                        <span className={`badge ${b.bookingType === 'offline' ? 'badge-orange' : 'badge-blue'}`}>
                          {b.bookingType === 'offline' ? '🚶 Walk-in' : '🌐 Online'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${BADGE[status] || 'badge-gray'}`}>{status}</span>
                      </td>
                      <td>
                        {status === 'Confirmed' && (
                          <button className="btn btn-sm btn-danger" onClick={() => cancelBooking(b._id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
