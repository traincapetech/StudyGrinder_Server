import Visitor from "../model/visitor.model.js";

/**
 * Validates the visitor ID format
 * Expects a non-empty string between 8 and 128 characters
 */
function isValidVisitorId(id) {
  return typeof id === "string" && id.trim().length >= 8 && id.trim().length <= 128;
}

/**
 * POST /api/visitors/track (or /visitors/track)
 * Tracks a unique visitor:
 * - Creates a record only if the visitorId does not already exist
 * - Protects against duplicate concurrent inserts via unique index and code 11000 handling
 * - Returns whether the visitor was newly created and the total unique visitor count
 */
export const trackVisitor = async (req, res) => {
  try {
    const { visitorId } = req.body || {};

    if (!isValidVisitorId(visitorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing visitorId parameter.",
      });
    }

    const cleanVisitorId = visitorId.trim();
    let isNewVisitor = false;

    // First check if this visitor already exists
    const existing = await Visitor.findOne({ visitorId: cleanVisitorId }).select("_id");

    if (existing) {
      isNewVisitor = false;
      // Update lastSeen asynchronously
      Visitor.updateOne({ _id: existing._id }, { $set: { lastSeen: new Date() } }).exec().catch(() => {});
    } else {
      try {
        await Visitor.create({
          visitorId: cleanVisitorId,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
        isNewVisitor = true;
      } catch (insertErr) {
        // Handle race conditions where two simultaneous requests from the same visitor
        // both passed the findOne check. MongoDB unique index code 11000 guarantees safety.
        if (insertErr.code === 11000) {
          isNewVisitor = false;
        } else {
          throw insertErr;
        }
      }
    }

    // Get current total unique visitor count
    const totalCount = await Visitor.countDocuments();

    return res.status(200).json({
      success: true,
      isNewVisitor,
      count: totalCount,
    });
  } catch (error) {
    console.error("❌ Error in trackVisitor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while tracking visitor.",
    });
  }
};

/**
 * GET /api/visitors/count (or /visitors/count)
 * Retrieves the current total unique visitor count
 */
export const getVisitorCount = async (req, res) => {
  try {
    const totalCount = await Visitor.countDocuments();
    return res.status(200).json({
      success: true,
      count: totalCount,
    });
  } catch (error) {
    console.error("❌ Error in getVisitorCount:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving visitor count.",
    });
  }
};
