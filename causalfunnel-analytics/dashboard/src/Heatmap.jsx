import { useEffect, useRef, useState } from 'react';
import { getPages, getHeatmap } from './api.js';

const VIEW_W = 900; // display width of the heatmap container

export default function Heatmap() {
  const [pages, setPages] = useState([]);
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('heat');
  const [showPage, setShowPage] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => { getPages().then((r) => setPages(r.pages)).catch((e) => setError(e.message)); }, []);

  useEffect(() => {
    if (!url) return;
    setData(null); setError('');
    getHeatmap(url).then(setData).catch((e) => setError(e.message));
  }, [url]);

  // Page size = largest recorded document size across clicks (fallback 1280x1800)
  const pageW = data ? Math.max(1280, ...data.clicks.map((c) => c.page_width || 0)) : 1280;
  const pageH = data ? Math.max(800, ...data.clicks.map((c) => c.page_height || 0)) : 1800;
  const scale = VIEW_W / pageW;
  const viewH = Math.round(pageH * scale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    data.clicks.forEach((c) => {
      const x = c.x * scale, y = c.y * scale;
      if (mode === 'dots') {
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230,57,70,0.75)'; ctx.fill();
      } else {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 35);
        g.addColorStop(0, 'rgba(255,0,0,0.35)'); g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, [data, mode, scale, viewH]);

  return (
    <div className="panel">
      <h2>Click heatmap</h2>
      <div className="controls">
        <select value={url} onChange={(e) => setUrl(e.target.value)}>
          <option value="">Select a page…</option>
          {pages.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className={mode === 'dots' ? 'active' : ''} onClick={() => setMode('dots')}>Dots</button>
        <button className={mode === 'heat' ? 'active' : ''} onClick={() => setMode('heat')}>Heat</button>
        <label><input type="checkbox" checked={showPage} onChange={(e) => setShowPage(e.target.checked)} /> Show page behind</label>
        {data && <strong>{data.total} clicks</strong>}
      </div>
      {error && <p className="error">{error}</p>}
      {!url && <p>Pick a page to view its clicks.</p>}
      {url && !data && !error && <p>Loading...</p>}
      {data && data.total === 0 && <p>No clicks recorded for this page.</p>}
      {data && (
        <div className="hm-wrap" style={{ width: VIEW_W, height: viewH }}>
          {showPage && (
            <iframe title="page" src={url} scrolling="no"
              style={{ width: pageW, height: pageH, transform: `scale(${scale})` }} />
          )}
          <canvas ref={canvasRef} width={VIEW_W} height={viewH} />
        </div>
      )}
      <p className="hint">If the page does not load (not running or blocks embedding), the grey background is used instead.</p>
    </div>
  );
}
