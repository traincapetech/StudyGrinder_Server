import express from "express";
import {
  trackVisitor,
  getVisitorCount,
} from "../controllers/visitor.controller.js";

const visitorRouter = express.Router();

// POST /track (or /api/visitors/track) - Track unique visitor
visitorRouter.post("/track", trackVisitor);

// GET /count (or /api/visitors/count) - Get total unique visitor count
visitorRouter.get("/count", getVisitorCount);

export default visitorRouter;
