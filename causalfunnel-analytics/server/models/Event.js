const mongoose = require('mongoose');

// Single-collection design: every tracked interaction is one document.
const EventSchema = new mongoose.Schema({
  session_id: { type: String, required: true, index: true },
  type: { type: String, enum: ['page_view', 'click'], required: true },
  page_url: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true },
  x: Number,            // page coordinates (clientX + scrollX)
  y: Number,            // page coordinates (clientY + scrollY)
  page_width: Number,   // full document size at click time, used to scale heatmap
  page_height: Number,
  user_agent: String,
  created_at: { type: Date, default: Date.now },
});

// Journey lookup: all events of a session in order
EventSchema.index({ session_id: 1, timestamp: 1 });
// Heatmap lookup: clicks for a page
EventSchema.index({ page_url: 1, type: 1 });

module.exports = mongoose.model('Event', EventSchema);
