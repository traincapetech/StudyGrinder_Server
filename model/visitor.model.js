import mongoose from "mongoose";

const visitorSchema = new mongoose.Schema({
  // Hashed fingerprint: IP + User-Agent so we never store raw PII
  fingerprint: {
    type: String,
    required: true,
    unique: true,
  },
  // Last time this unique visitor was seen
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  // Total unique visitor count is just the document count, but we
  // also track first visit date for analytics
  firstSeen: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: remove old fingerprints after 24 hours so the same
// visitor counts again the next day (standard unique-daily-visitor behaviour).
// If you want lifetime unique visitors, remove this index.
visitorSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 86400 });

const Visitor = mongoose.model("Visitor", visitorSchema);

export default Visitor;
