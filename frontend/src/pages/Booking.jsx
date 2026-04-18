import { useNavigate } from 'react-router-dom';

// Booking is handled directly in VenueDetail — this page redirects to explore
export default function Booking() {
  const navigate = useNavigate();
  return (
    <div className="page-wrap flex-center" style={{ minHeight:'80vh', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:'3rem' }}>🏟️</div>
      <h2>Ready to Book?</h2>
      <p className="text-muted">Browse venues and book a slot directly from the venue page.</p>
      <button className="btn btn-primary" onClick={() => navigate('/explore')}>Browse Venues</button>
    </div>
  );
}
