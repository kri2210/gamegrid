import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { InlineLoader } from '../../components/Loader';

const ALL_SPORTS = ['Box Cricket','Badminton','Tennis','Football','Basketball'];
const ALL_AMENITIES = ['Parking','Changing Room','Cafeteria','Washrooms','First Aid','CCTV','Floodlights','Scoreboard'];
const HOURS = Array.from({ length:24 }, (_,i) => `${String(i).padStart(2,'0')}:00`);

export default function OwnerVenueForm() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isEdit   = Boolean(id);
  const fileRef  = useRef();

  const [loading,   setLoading]   = useState(isEdit);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState('');
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    name:'', address:'', city:'', locality:'', locationUrl:'', description:'',
    activeHoursStart:'06:00', activeHoursEnd:'22:00',
    sports:[], amenities:[], pricing:{}, peakHours:[]
  });

  useEffect(() => {
    if (!isEdit) return;
    axios.get(`/api/owner/venues`).then(r => {
      const v = r.data.find(x => x._id === id);
      if (!v) { navigate('/owner/venues'); return; }
      setForm({
        name: v.name, address: v.address, city: v.city, locality: v.locality||'',
        locationUrl: v.locationUrl||'', description: v.description||'',
        activeHoursStart: v.activeHoursStart, activeHoursEnd: v.activeHoursEnd,
        sports: v.sports||[], amenities: v.amenities||[], pricing: v.pricing||{}, peakHours: v.peakHours||[]
      });
      setPreview(`/api/venues/${id}/image`);
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleItem = (field, val) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val]
    }));
  };

  const handlePriceChange = (sport, type, val) => {
    setForm(f => ({
      ...f,
      pricing: { ...f.pricing, [sport]: { ...(f.pricing[sport]||{base:500,peak:800}), [type]: parseInt(val)||0 } }
    }));
  };

  const handleImage = e => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.name || !form.address || !form.city) { toast.error('Name, address and city are required'); return; }
    if (form.sports.length === 0) { toast.error('Select at least one sport'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => {
        if (k === 'sports' || k === 'amenities' || k === 'peakHours') {
          v.forEach(item => fd.append(k, item));
        } else if (k === 'pricing') {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, v);
        }
      });
      if (imageFile) fd.append('image', imageFile);

      if (isEdit) {
        await axios.put(`/api/owner/venues/${id}`, fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Venue updated!');
      } else {
        await axios.post('/api/owner/venues', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success('Venue created!');
      }
      navigate('/owner/venues');
    } catch(err) {
      toast.error(err.response?.data?.error || 'Failed to save venue');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="loader-wrap"><div className="loader"/></div>;

  return (
    <div className="page-wrap">
      <div className="container" style={{ maxWidth:720 }}>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/owner/venues')}>← Back</button>
          <h1>{isEdit ? 'Edit' : 'Add'} <span className="gradient-text">Venue</span></h1>
        </div>

        <form onSubmit={submit}>
          {/* Image Upload */}
          <div className="card mb-6">
            <h3 style={{ marginBottom:16 }}>📸 Venue Image</h3>
            <div style={{ display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ width:160, height:120, borderRadius:10, overflow:'hidden', background:'rgba(0,255,136,0.05)', border:'2px dashed var(--border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}
                onClick={() => fileRef.current.click()}>
                {preview ? <img src={preview} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="preview" onError={() => setPreview('')} /> : '📷'}
              </div>
              <div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()}>
                  {preview ? '🔄 Change Image' : '📤 Upload Image'}
                </button>
                <div className="form-hint mt-4">Max 5MB · JPG, PNG, WebP</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImage} />
            </div>
          </div>

          {/* Basic Info */}
          <div className="card mb-6">
            <h3 style={{ marginBottom:16 }}>📋 Basic Info</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="form-group">
                <label className="form-label">Venue Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required placeholder="SportZone Arena" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" value={form.city} onChange={e => setForm(f=>({...f,city:e.target.value}))} required placeholder="Mumbai" />
                </div>
                <div className="form-group">
                  <label className="form-label">Locality</label>
                  <input className="form-input" value={form.locality} onChange={e => setForm(f=>({...f,locality:e.target.value}))} placeholder="Andheri West" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address *</label>
                <input className="form-input" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} required placeholder="Plot 12, Main Road..." />
              </div>
              <div className="form-group">
                <label className="form-label">🗺️ Google Maps URL</label>
                <input className="form-input" value={form.locationUrl} onChange={e => setForm(f=>({...f,locationUrl:e.target.value}))} placeholder="https://maps.google.com/..." />
                <div className="form-hint">Paste the Google Maps link to your venue (share → copy link)</div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Tell players about your venue..." />
              </div>
            </div>
          </div>

          {/* Sports */}
          <div className="card mb-6">
            <h3 style={{ marginBottom:16 }}>🏅 Sports Available</h3>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {ALL_SPORTS.map(s => (
                <button type="button" key={s}
                  className={`btn btn-sm ${form.sports.includes(s)?'btn-primary':'btn-ghost'}`}
                  style={{ borderRadius:50 }} onClick={() => toggleItem('sports', s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          {form.sports.length > 0 && (
            <div className="card mb-6">
              <h3 style={{ marginBottom:16 }}>💰 Pricing per Hour</h3>
              {form.sports.map(sport => (
                <div key={sport} style={{ marginBottom:16, padding:16, background:'rgba(255,255,255,0.04)', borderRadius:10 }}>
                  <div className="fw-700 mb-4">{sport}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div className="form-group">
                      <label className="form-label">Base Price (₹)</label>
                      <input type="number" className="form-input" placeholder="500"
                        value={form.pricing[sport]?.base || ''} onChange={e => handlePriceChange(sport,'base',e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Peak Price (₹)</label>
                      <input type="number" className="form-input" placeholder="800"
                        value={form.pricing[sport]?.peak || ''} onChange={e => handlePriceChange(sport,'peak',e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hours */}
          <div className="card mb-6">
            <h3 style={{ marginBottom:16 }}>🕐 Active Hours</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="form-group">
                <label className="form-label">Open from</label>
                <select className="form-select" value={form.activeHoursStart} onChange={e => setForm(f=>({...f,activeHoursStart:e.target.value}))}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Closes at</label>
                <select className="form-select" value={form.activeHoursEnd} onChange={e => setForm(f=>({...f,activeHoursEnd:e.target.value}))}>
                  {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="card mb-6">
            <h3 style={{ marginBottom:16 }}>✅ Amenities</h3>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {ALL_AMENITIES.map(a => (
                <button type="button" key={a}
                  className={`btn btn-sm ${form.amenities.includes(a)?'btn-primary':'btn-ghost'}`}
                  style={{ borderRadius:50 }} onClick={() => toggleItem('amenities', a)}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:12 }}>
            <button type="button" className="btn btn-ghost w-full" onClick={() => navigate('/owner/venues')}>Cancel</button>
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? <InlineLoader /> : (isEdit ? '✅ Update Venue' : '🏟️ Create Venue')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
