import { useNavigate } from 'react-router-dom';

const SPORTS = [
  { icon:'🏏', name:'Box Cricket', desc:'Indoor cricket arena' },
  { icon:'🏸', name:'Badminton',   desc:'Pro-grade courts' },
  { icon:'🎾', name:'Tennis',      desc:'Clay & hard courts' },
  { icon:'⚽', name:'Football',    desc:'5-a-side & 7-a-side' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="hero" style={{ paddingTop:70 }}>
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-content">
          <div className="hero-tag animate-fade">
            <span>⚡</span> India's Premier Sports Booking Platform
          </div>
          <h1 className="hero-title animate-slide">
            Book Your <span className="gradient-text">Dream Venue</span><br />
            Play Like a Champion
          </h1>
          <p className="hero-desc animate-fade" style={{ animationDelay:'0.1s' }}>
            Find and book top sports venues instantly. Join tournaments, compete with teams,
            and experience sport at its finest.
          </p>
          <div className="hero-btns animate-fade" style={{ animationDelay:'0.2s' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              🚀 Get Started Free
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>

          <div className="hero-stats animate-fade" style={{ animationDelay:'0.3s' }}>
            <div className="hero-stat">
              <div className="hero-stat-num">500+</div>
              <div className="hero-stat-label">Venues</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">50K+</div>
              <div className="hero-stat-label">Players</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">1K+</div>
              <div className="hero-stat-label">Events</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-num">4.9★</div>
              <div className="hero-stat-label">Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sports Section */}
      <section className="section" style={{ background:'rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2>Sports We <span className="gradient-text">Cover</span></h2>
            <p>Book premium venues for your favourite sport</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:24 }}>
            {SPORTS.map(s => (
              <div key={s.name} className="card" style={{ textAlign:'center', cursor:'pointer' }}
                   onClick={() => navigate('/register')}>
                <div style={{ fontSize:'3rem', margin:'0 auto 16px' }} className="animate-float">{s.icon}</div>
                <h3 style={{ marginBottom:8 }}>{s.name}</h3>
                <p style={{ fontSize:'0.85rem' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container" style={{ textAlign:'center' }}>
          <h2 style={{ marginBottom:16 }}>Are you a <span className="gradient-text">Venue Owner?</span></h2>
          <p style={{ maxWidth:480, margin:'0 auto 32px' }}>
            List your venue, manage bookings, create tournaments and grow your business with GameGrid.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
            Register Your Venue 🏟️
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop:'1px solid var(--border)', padding:'32px 0', background:'rgba(255,255,255,0.02)' }}>
        <div className="container" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <span style={{ fontFamily:'var(--font-brand)', fontWeight:900, fontSize:'1.2rem' }} className="gradient-text">GAMEGRID</span>
          <span className="text-faint text-sm">© 2026 GameGrid. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
