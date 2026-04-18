import { useNavigate } from 'react-router-dom';

const SPORT_ICONS = {
  'Box Cricket': '🏏',
  'Badminton':   '🏸',
  'Tennis':      '🎾',
  'Football':    '⚽',
  'Basketball':  '🏀',
};

export default function VenueCard({ venue }) {
  const navigate = useNavigate();
  const minPrice = venue.pricing
    ? Math.min(...Object.values(venue.pricing).map(p => p.base || 999))
    : 0;

  return (
    <div className="venue-card animate-fade" onClick={() => navigate(`/venue/${venue._id}`)}>
      <div className="venue-img">
        {venue._id ? (
          <img
            src={`/api/venues/${venue._id}/image`}
            alt={venue.name}
            onError={e => { e.target.style.display='none'; e.target.parentNode.querySelector('.venue-placeholder').style.display='flex'; }}
          />
        ) : null}
        <div className="venue-placeholder" style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',fontSize:'3rem'}}>
          🏟️
        </div>
      </div>
      <div className="venue-card-body">
        <div className="venue-name">{venue.name}</div>
        <div className="venue-location">
          📍 {venue.locality ? `${venue.locality}, ` : ''}{venue.city}
        </div>
        <div className="venue-sports">
          {(venue.sports || []).map(s => (
            <span key={s} className="badge badge-blue">
              {SPORT_ICONS[s] || '🏅'} {s}
            </span>
          ))}
        </div>
        <div className="venue-price">
          From <strong>₹{minPrice}</strong>/hr
        </div>
      </div>
    </div>
  );
}
