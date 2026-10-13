require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
app.use(cors()); // tracker runs on any site, so allow all origins
// sendBeacon sends text/plain to avoid CORS preflight, so parse JSON from both types
app.use(express.json({ limit: '100kb', type: ['application/json', 'text/plain'] }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', require('./routes/events'));

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));
// Central error handler (also catches malformed JSON)
app.use((err, req, res, next) => {
  console.error(err.message);
  const status = err.status || 500;
  res.status(status).json({ success: false, error: status === 500 ? 'Internal server error' : err.message });
});

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log('API listening on port ' + PORT)))
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
