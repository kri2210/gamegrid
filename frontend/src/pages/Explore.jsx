import { useState, useEffect } from 'react';
import axios from 'axios';
import VenueCard from '../components/VenueCard';
import Loader from '../components/Loader';

const SPORTS = ['all','Box Cricket','Badminton','Tennis','Football'];

export default function Explore() {
  const [venues,  setVenues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ sport:'all', city:'', search:'', minPrice:'', maxPrice:'' });

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.sport && filters.sport !== 'all') params.sport = filters.sport;
      if (filters.city)     params.city = filters.city;
      if (filters.search)   params.search = filters.search;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      const r = await axios.get('/api/venues', { params });
      setVenues(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVenues(); }, [filters.sport]);

  const handleSearch = e => {
    e.preventDefault();
    fetchVenues();
  };

  return (
    <div className="page-wrap">
      <div className="container">
        <div className="page-header">
          <h1>Explore <span className="gradient-text">Venues</span></h1>
          <p>Find and book the perfect sports venue near you</p>
        </div>

        {/* Filters */}
        <form className="filter-bar mb-6" onSubmit={handleSearch}>
          <div className="form-group" style={{ flex:2, minWidth:200 }}>
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Venue name, area..."
              value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth:140 }}>
            <label className="form-label">City</label>
            <input className="form-input" placeholder="City"
              value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth:120 }}>
            <label className="form-label">Min ₹/hr</label>
            <input className="form-input" type="number" placeholder="0"
              value={filters.minPrice} onChange={e => setFilters(f => ({ ...f, minPrice: e.target.value }))} />
          </div>
          <div className="form-group" style={{ minWidth:120 }}>
            <label className="form-label">Max ₹/hr</label>
            <input className="form-input" type="number" placeholder="Any"
              value={filters.maxPrice} onChange={e => setFilters(f => ({ ...f, maxPrice: e.target.value }))} />
          </div>
          <button className="btn btn-primary" type="submit" style={{ alignSelf:'flex-end' }}>🔍 Search</button>
        </form>

        {/* Sport pills */}
        <div className="sport-pills mb-6">
          {SPORTS.map(s => (
            <button key={s} className={`sport-pill${filters.sport===s?' active':''}`}
              onClick={() => setFilters(f => ({ ...f, sport: s }))}>
              {s === 'Box Cricket' ? '🏏' : s === 'Badminton' ? '🏸' : s === 'Tennis' ? '🎾' : s === 'Football' ? '⚽' : '🏅'}
              {s === 'all' ? 'All Sports' : s}
            </button>
          ))}
        </div>

        {loading ? <Loader fullPage={false} /> : venues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏟️</div>
            <div className="empty-title">No Venues Found</div>
            <div className="empty-desc">Try adjusting your search filters</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
            {venues.map(v => <VenueCard key={v._id} venue={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
