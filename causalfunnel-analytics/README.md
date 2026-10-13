# CausalFunnel User Analytics

Track `page_view` and `click` events on any webpage, store them in MongoDB, and explore them in a React dashboard (sessions, user journeys, click heatmap).

```
Browser (tracker.js) --POST /api/events--> Express API --> MongoDB Atlas
                                                ^
                     React dashboard (Vite) -----+  GET /api/sessions, /heatmap ...
```

## Tech stack
Node.js, Express, MongoDB (Mongoose), React + Vite + react-router, vanilla JS tracker.

## Structure
`/server` API | `/dashboard` React app | `/tracker` tracker.js + demo pages

## Setup
Prerequisites: Node 18+, a MongoDB Atlas connection string.

```bash
# 1. API
cd server && npm install
cp .env.example .env        # put your MONGODB_URI in .env
npm run seed                # optional: ~20 fake sessions
npm run dev                 # http://localhost:5000

# 2. Dashboard (new terminal)
cd dashboard && npm install
cp .env.example .env
npm run dev                 # http://localhost:5173

# 3. Demo pages (new terminal)
cd tracker && npx serve -l 3000     # open http://localhost:3000/demo/index.html
```
Seed data uses `http://localhost:3000/demo/...` URLs (override with `SEED_BASE_URL`) so seeded heatmap pages match the demo pages.

## Embed on any site
```html
<script src="https://YOUR-HOST/tracker.js" data-api="https://YOUR-API"></script>
```

## API
| Method | Path | Notes |
|---|---|---|
| POST | `/api/events` | one event or array (max 100). Click events need `x`,`y`. Returns 201 |
| GET | `/api/sessions?page=&limit=` | `{session_id,total_events,first_seen,last_seen}`, newest first |
| GET | `/api/sessions/:id/events` | events ordered by timestamp |
| GET | `/api/heatmap?url=` | clicks `{x,y,page_width,page_height}` |
| GET | `/api/pages` | distinct page URLs |
| GET | `/health` | liveness |

Event example:
```json
{"session_id":"uuid","type":"click","page_url":"http://localhost:3000/demo/index.html","timestamp":"2026-10-13T10:00:00.000Z","x":420,"y":310,"page_width":1280,"page_height":1800}
```

Quick test:
```bash
curl -X POST localhost:5000/api/events -H "Content-Type: application/json" \
 -d '{"session_id":"t1","type":"page_view","page_url":"http://localhost:3000/demo/index.html","timestamp":"2026-10-13T10:00:00Z"}'
curl localhost:5000/api/sessions
```

## Data model and indexes
One `events` collection. Indexes: `{session_id, timestamp}` (journey queries and session grouping), `{page_url, type}` (heatmap queries).

## Assumptions and trade-offs
- Single collection; sessions derived by aggregation (simple; a separate sessions collection would scale better).
- Session = UUID in localStorage, renewed after 30 min of inactivity.
- Click coordinates are page-based (client + scroll), so they stay stable while scrolling; layouts differ across screen sizes, so heatmaps are approximate. Document size is stored per click for scaling.
- URLs are normalised to origin + path (query/hash dropped) so one page = one heatmap.
- Tracker uses `sendBeacon` with `text/plain` (avoids CORS preflight) and batches every 2s / on pagehide.
- No auth, no bot filtering, CORS open to all origins; only basic rate limiting and a 100kb body limit.
- Heatmap iframe may be blocked by `X-Frame-Options`; grey background is the fallback.

## Future improvements
Scroll tracking, rage clicks, funnels, auth, Redis queue for ingestion, device-size segmentation.

## Deployment
1. Atlas: free M0 cluster, create DB user, allow `0.0.0.0/0` in Network Access, copy connection string.
2. Render (Web Service, root dir `server`): build `npm install`, start `npm start`, env `MONGODB_URI`.
3. Vercel/Netlify (root dir `dashboard`): build `npm run build`, output `dist`, env `VITE_API_URL=<render url>`.
4. Host `/tracker` as a static site; change `data-api` in the demo pages to the Render URL.
5. Live demo links: _add here_.
