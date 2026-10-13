// Generates ~20 fake sessions: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

const BASE = process.env.SEED_BASE_URL || 'http://localhost:3000/demo';
const PAGES = [BASE + '/index.html', BASE + '/products.html'];
const rnd = (a, b) => Math.floor(Math.random() * (b - a)) + a;

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = [];
  for (let s = 0; s < 20; s++) {
    const id = 'seed-' + Math.random().toString(36).slice(2, 12);
    let t = Date.now() - rnd(0, 7 * 24 * 3600 * 1000);
    const visits = rnd(1, 4);
    for (let v = 0; v < visits; v++) {
      const url = PAGES[rnd(0, PAGES.length)];
      docs.push({ session_id: id, type: 'page_view', page_url: url, timestamp: new Date(t), user_agent: 'seed' });
      for (let c = 0; c < rnd(1, 8); c++) {
        t += rnd(1000, 15000);
        // cluster clicks around a few "hot" spots
        const hot = [[640, 90], [300, 600], [900, 600], [640, 1200]][rnd(0, 4)];
        docs.push({ session_id: id, type: 'click', page_url: url, timestamp: new Date(t),
          x: Math.max(0, hot[0] + rnd(-60, 60)), y: Math.max(0, hot[1] + rnd(-40, 40)),
          page_width: 1280, page_height: 1800, user_agent: 'seed' });
      }
      t += rnd(2000, 10000);
    }
  }
  await Event.insertMany(docs);
  console.log('Inserted ' + docs.length + ' events');
  await mongoose.disconnect();
})();
