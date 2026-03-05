require("dotenv").config();
const mongoose = require("mongoose");

// Disable buffering globally BEFORE any models are loaded
mongoose.set('bufferCommands', false);

let app = null;
let dbConnected = false;
let connectionAttempted = false;

module.exports = async (req, res) => {
  console.log(`[VERCEL] ${req.method} ${req.url}`);

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://eventix-frontend-8v2j.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Correlation-ID,x-user-id,x-user-role");
    return res.status(200).end();
  }

  try {
    // Connect to database once
    if (!dbConnected && !connectionAttempted) {
      connectionAttempted = true;
      console.log("[VERCEL] Connecting to database...");
      console.log("[VERCEL] MONGO_URI exists:", !!process.env.MONGO_URI);
      console.log("[VERCEL] MONGO_URI prefix:", process.env.MONGO_URI?.substring(0, 20));
      
      const connectDB = require("./src/config/db");
      await connectDB();
      dbConnected = true;
      console.log("[VERCEL] Database connected successfully");
    }

    // Load app once (AFTER DB is connected)
    if (!app) {
      console.log("[VERCEL] Loading app...");
      app = require("./src/app");
      console.log("[VERCEL] App loaded");
    }

    return app(req, res);
  } catch (error) {
    console.error("[VERCEL] Error:", error.message, error.stack);
    connectionAttempted = false; // Allow retry on next request
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        message: error.message,
      });
    }
  }
};
