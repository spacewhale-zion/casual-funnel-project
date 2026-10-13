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

## Running the project locally

You need **three terminals** (API, dashboard, demo site). Run them in this order.

### 0. Prerequisites
- Node.js 18+ (`node -v`) and npm
- A MongoDB Atlas free cluster:
  1. Create a free M0 cluster at https://cloud.mongodb.com
  2. Database Access: add a user with a password
  3. Network Access: add IP `0.0.0.0/0` (or your own IP)
  4. Connect > Drivers: copy the connection string, replace `<password>`, and add a database name (e.g. `.../causalfunnel?retryWrites=true&w=majority`)

### 1. Start the API (terminal 1)
```bash
cd server
npm install
cp .env.example .env          # Windows: copy .env.example .env
# open .env and paste your MONGODB_URI
npm run seed                  # optional: inserts ~20 fake sessions
npm run dev                   # API on http://localhost:5000
```
Verify: open http://localhost:5000/health and expect `{"status":"ok"}`. The terminal should print `MongoDB connected`.

### 2. Start the dashboard (terminal 2)
```bash
cd dashboard
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:5000
npm run dev                   # dashboard on http://localhost:5173
```
Verify: open http://localhost:5173. If you seeded data, the Sessions tab lists sessions.

### 3. Start the demo site with the tracker (terminal 3)
```bash
cd tracker
npx serve -l 3000             # serves tracker.js and the demo pages
```
Open http://localhost:3000/demo/index.html, click around, visit "Products", then go back to the dashboard and refresh. Your session appears within a few seconds (events are batched every 2s).

### 4. Use the dashboard
- **Sessions tab**: click a session to see its ordered events (the user journey).
- **Heatmap tab**: choose a page from the dropdown to see click positions. Toggle Dots/Heat, and "Show page behind" (needs the demo site from step 3 to be running; otherwise a grey background is shown).

### Troubleshooting
| Problem | Fix |
|---|---|
| `MongoDB connection` error on start | Check `MONGODB_URI` in `server/.env`, the password (URL-encode special characters), and that your IP is allowed in Atlas Network Access |
| `Port 5000 already in use` | Set `PORT=5001` in `server/.env` and update `VITE_API_URL` and the `data-api` attribute in the demo pages |
| Dashboard shows "Failed to fetch" | API is not running, or `VITE_API_URL` is wrong. Restart `npm run dev` in the dashboard after editing `.env` |
| No new sessions after clicking | Check the browser console/network tab for `POST /api/events`; confirm `data-api` in the demo page points to your API |
| Heatmap page is empty/grey | Select the exact page URL used by the demo (`http://localhost:3000/demo/index.html`); the grey background is normal if the page cannot be embedded |
| Want a clean slate | New session: clear localStorage key `cf_session_id` in the browser. Clear data: drop the `events` collection in Atlas |

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