const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

async function get(path) {
  const res = await fetch(BASE + path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

export const getSessions = (page = 1, limit = 15) => get(`/api/sessions?page=${page}&limit=${limit}`);
export const getSessionEvents = (id) => get(`/api/sessions/${encodeURIComponent(id)}/events`);
export const getPages = () => get('/api/pages');
export const getHeatmap = (url) => get(`/api/heatmap?url=${encodeURIComponent(url)}`);
