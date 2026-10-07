import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import Visitor from "../model/visitor.model.js";

dns.setDefaultResultOrder("ipv4first");
dotenv.config();

async function runTest() {
  console.log("🧪 Testing First-Party Unique Visitor Tracking System...\n");

  const uri = process.env.MongoDBURI || process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MongoDB URI not found in .env");
    process.exit(1);
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    family: 4,
  });

  console.log("✅ Connected to MongoDB");

  // Ensure index is created
  await Visitor.init();

  const initialCount = await Visitor.countDocuments();
  console.log(`📊 Initial unique visitor count: ${initialCount}`);

  // Test 1: First visit
  const testVisitorId1 = `test-visitor-1-${Date.now()}`;
  console.log(`\n1️⃣ Testing First Visit with ID: ${testVisitorId1}`);
  
  let isNew1 = false;
  const existing1 = await Visitor.findOne({ visitorId: testVisitorId1 });
  if (!existing1) {
    try {
      await Visitor.create({ visitorId: testVisitorId1 });
      isNew1 = true;
    } catch (e) {
      if (e.code === 11000) isNew1 = false;
      else throw e;
    }
  }
  const countAfter1 = await Visitor.countDocuments();
  console.log(`   isNewVisitor: ${isNew1} (Expected: true)`);
  console.log(`   Count: ${countAfter1} (Expected: ${initialCount + 1})`);
  if (!isNew1 || countAfter1 !== initialCount + 1) {
    throw new Error("Test 1 Failed: First visit did not increment count");
  }

  // Test 2: Refresh / Repeat with same visitorId
  console.log(`\n2️⃣ Testing Refresh with same ID: ${testVisitorId1}`);
  let isNew2 = false;
  const existing2 = await Visitor.findOne({ visitorId: testVisitorId1 });
  if (existing2) {
    isNew2 = false;
    await Visitor.updateOne({ _id: existing2._id }, { $set: { lastSeen: new Date() } });
  }
  const countAfter2 = await Visitor.countDocuments();
  console.log(`   isNewVisitor: ${isNew2} (Expected: false)`);
  console.log(`   Count: ${countAfter2} (Expected: ${initialCount + 1})`);
  if (isNew2 || countAfter2 !== initialCount + 1) {
    throw new Error("Test 2 Failed: Refresh incremented the count!");
  }

  // Test 3: Concurrent / Race Condition test with 5 simultaneous requests with testVisitorId2
  const testVisitorId2 = `test-visitor-2-${Date.now()}`;
  console.log(`\n3️⃣ Testing Race Condition (5 simultaneous requests for ${testVisitorId2})`);
  
  const trackConcurrently = async () => {
    const existing = await Visitor.findOne({ visitorId: testVisitorId2 });
    if (existing) {
      return false;
    }
    try {
      await Visitor.create({ visitorId: testVisitorId2 });
      return true;
    } catch (err) {
      if (err.code === 11000) {
        return false;
      }
      throw err;
    }
  };

  const results = await Promise.all([
    trackConcurrently(),
    trackConcurrently(),
    trackConcurrently(),
    trackConcurrently(),
    trackConcurrently(),
  ]);

  const newCount = results.filter((r) => r === true).length;
  const existingCount = results.filter((r) => r === false).length;
  const countAfter3 = await Visitor.countDocuments();

  console.log(`   Concurrent results: ${JSON.stringify(results)}`);
  console.log(`   Newly registered: ${newCount} (Expected: 1)`);
  console.log(`   Recognized as duplicate: ${existingCount} (Expected: 4)`);
  console.log(`   Count after race condition: ${countAfter3} (Expected: ${initialCount + 2})`);

  if (newCount !== 1 || countAfter3 !== initialCount + 2) {
    throw new Error("Test 3 Failed: Race condition created duplicate records!");
  }

  // Clean up test documents
  await Visitor.deleteMany({
    visitorId: { $in: [testVisitorId1, testVisitorId2] },
  });
  console.log("\n🧹 Cleaned up test visitor records.");
  const finalCount = await Visitor.countDocuments();
  console.log(`📊 Final clean count: ${finalCount} (Matches initial count: ${finalCount === initialCount})`);

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
