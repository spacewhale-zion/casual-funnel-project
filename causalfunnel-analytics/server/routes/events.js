const router = require('express').Router();
const Event = require('../models/Event');

// Normalise a URL to origin + pathname (drops query/hash so one page = one heatmap).
function normalizeUrl(u) {
  try {
    const p = new URL(String(u).slice(0, 2000));
    if (!['http:', 'https:'].includes(p.protocol)) return null;
    return p.origin + p.pathname;
  } catch (e) {
    return null;
  }
}

// Validate one event; returns { error } or { doc }.
function clean(e, ua) {
  if (!e || typeof e !== 'object') return { error: 'event must be an object' };
  if (!e.session_id || typeof e.session_id !== 'string' || e.session_id.length > 100)
    return { error: 'session_id is required' };
  if (!['page_view', 'click'].includes(e.type)) return { error: 'type must be page_view or click' };
  const page_url = normalizeUrl(e.page_url);
  if (!page_url) return { error: 'page_url must be a valid http(s) URL' };
  const ts = new Date(e.timestamp);
  if (!e.timestamp || isNaN(ts)) return { error: 'timestamp must be a valid date' };
  const doc = { session_id: e.session_id, type: e.type, page_url, timestamp: ts, user_agent: ua };
  if (e.type === 'click') {
    if (typeof e.x !== 'number' || typeof e.y !== 'number') return { error: 'click events need numeric x and y' };
    doc.x = e.x; doc.y = e.y;
    if (typeof e.page_width === 'number') doc.page_width = e.page_width;
    if (typeof e.page_height === 'number') doc.page_height = e.page_height;
  }
  return { doc };
}

// 1. Receive events (single object or array)
router.post('/events', async (req, res, next) => {
  try {
    const list = Array.isArray(req.body) ? req.body : [req.body];
    if (list.length === 0 || list.length > 100)
      return res.status(400).json({ success: false, error: 'send 1-100 events' });
    const docs = [];
    for (const e of list) {
      const r = clean(e, req.get('user-agent'));
      if (r.error) return res.status(400).json({ success: false, error: r.error });
      docs.push(r.doc);
    }
    await Event.insertMany(docs);
    res.status(201).json({ success: true, inserted: docs.length });
  } catch (err) { next(err); }
});

// 2. Sessions with event counts (paginated)
router.get('/sessions', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const [out] = await Event.aggregate([
      { $group: { _id: '$session_id', total_events: { $sum: 1 },
          first_seen: { $min: '$timestamp' }, last_seen: { $max: '$timestamp' } } },
      { $sort: { last_seen: -1 } },
      { $facet: {
          data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
          meta: [{ $count: 'total' }] } },
    ]);
    const total = out.meta[0] ? out.meta[0].total : 0;
    const sessions = out.data.map((s) => ({ session_id: s._id, total_events: s.total_events,
      first_seen: s.first_seen, last_seen: s.last_seen }));
    res.json({ success: true, page, limit, total, total_pages: Math.ceil(total / limit), sessions });
  } catch (err) { next(err); }
});

// 3. All events for one session, ordered
router.get('/sessions/:sessionId/events', async (req, res, next) => {
  try {
    const events = await Event.find({ session_id: req.params.sessionId })
      .sort({ timestamp: 1 }).select('-__v').lean();
    res.json({ success: true, count: events.length, events });
  } catch (err) { next(err); }
});

// 4. Click data for a page (heatmap)
router.get('/heatmap', async (req, res, next) => {
  try {
    const url = normalizeUrl(req.query.url);
    if (!url) return res.status(400).json({ success: false, error: 'valid ?url= is required' });
    const clicks = await Event.find({ page_url: url, type: 'click' })
      .select('x y page_width page_height -_id').limit(10000).lean();
    res.json({ success: true, page_url: url, total: clicks.length, clicks });
  } catch (err) { next(err); }
});

// 5. Distinct tracked pages (for the dropdown)
router.get('/pages', async (req, res, next) => {
  try {
    const pages = await Event.distinct('page_url');
    res.json({ success: true, pages: pages.sort() });
  } catch (err) { next(err); }
});

module.exports = router;
