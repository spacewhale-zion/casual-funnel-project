import { useEffect, useState } from 'react';
import { getSessions, getSessionEvents } from './api.js';

const fmt = (d) => new Date(d).toLocaleString();

export default function Sessions() {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState(null);
  const [evError, setEvError] = useState('');

  useEffect(() => {
    setData(null); setError('');
    getSessions(page).then(setData).catch((e) => setError(e.message));
  }, [page]);

  function open(id) {
    setSelected(id); setEvents(null); setEvError('');
    getSessionEvents(id).then((r) => setEvents(r.events)).catch((e) => setEvError(e.message));
  }

  return (
    <div className="two-col">
      <section className="panel">
        <h2>Sessions {data && <small>({data.total})</small>}</h2>
        {error && <p className="error">{error}</p>}
        {!data && !error && <p>Loading...</p>}
        {data && data.sessions.length === 0 && <p>No sessions yet. Open the demo page and click around.</p>}
        {data && data.sessions.length > 0 && (
          <>
            <table>
              <thead><tr><th>Session</th><th>Events</th><th>First seen</th><th>Last seen</th></tr></thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.session_id} className={s.session_id === selected ? 'sel' : ''} onClick={() => open(s.session_id)}>
                    <td title={s.session_id}>{s.session_id.slice(0, 8)}…</td>
                    <td>{s.total_events}</td>
                    <td>{fmt(s.first_seen)}</td>
                    <td>{fmt(s.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
              <span>Page {data.page} / {data.total_pages}</span>
              <button disabled={page >= data.total_pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>User journey</h2>
        {!selected && <p>Select a session to see its events.</p>}
        {selected && !events && !evError && <p>Loading...</p>}
        {evError && <p className="error">{evError}</p>}
        {events && events.length === 0 && <p>No events.</p>}
        {events && (
          <ol className="timeline">
            {events.map((e) => (
              <li key={e._id}>
                <span className="icon">{e.type === 'click' ? '👆' : '🌐'}</span>
                <div>
                  <strong>{e.type}</strong> <span className="time">{fmt(e.timestamp)}</span>
                  <div className="url">{e.page_url}</div>
                  {e.type === 'click' && <div className="xy">x: {e.x}, y: {e.y}</div>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
