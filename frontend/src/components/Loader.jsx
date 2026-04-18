export default function Loader({ fullPage = true }) {
  if (fullPage) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
        <div style={{ textAlign:'center' }}>
          <div className="loader" style={{ margin:'0 auto 16px' }} />
          <p className="text-muted text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  return <div className="loader-wrap"><div className="loader" /></div>;
}

export function InlineLoader() {
  return <div className="loader loader-sm loader-inline" />;
}
