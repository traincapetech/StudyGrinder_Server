import mongoose from "mongoose";

/**
 * Unique Visitor Model
 * Tracks unique browser visitors via persistent anonymous visitor IDs.
 *
 * Important Distinction:
 * - This model tracks UNIQUE BROWSER VISITORS.
 * - Different browsers, incognito sessions, or cleared localStorage will generate new visitor IDs.
 * - No PII (IP address, names, emails) is stored here to ensure complete visitor privacy.
 * - visitorId has a unique index to guarantee atomic uniqueness and prevent duplicate counts.
 */
const visitorSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
});

const Visitor = mongoose.model("Visitor", visitorSchema);

export default Visitor;
