require("dotenv").config();
const mongoose = require("mongoose");

// Disable buffering globally BEFORE any models are loaded
mongoose.set('bufferCommands', false);

let app = null;
let connectionPromise = null;

async function ensureConnection() {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    console.log("Already connected");
    return true;
  }

  // Connection in progress, wait for existing promise
  if (connectionPromise) {
    console.log("Waiting for existing connection...");
    return await connectionPromise;
  }

  // Start new connection
  console.log("Starting new connection...");
  connectionPromise = (async () => {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI not found");
      }

      console.log("Connecting to MongoDB...");
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      
      console.log("MongoDB connected successfully");
      connectionPromise = null;
      return true;
    } catch (error) {
      console.error("MongoDB connection failed:", error.message);
      connectionPromise = null;
      return false;
    }
  })();

  return await connectionPromise;
}

module.exports = async (req, res) => {
  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "https://eventix-frontend-8v2j.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Correlation-ID,x-user-id,x-user-role");
    return res.status(200).end();
  }

  try {
    console.log(`Request: ${req.method} ${req.url}`);
    
    // Ensure database connection
    const connected = await ensureConnection();
    console.log("Connection result:", connected);
    
    if (!connected) {
      return res.status(503).json({
        success: false,
        message: "Database connection failed",
        error: "Service temporarily unavailable"
      });
    }

    // Load app once (AFTER DB is connected)
    if (!app) {
      console.log("Loading app...");
      app = require("./src/app");
    }

    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error.message, error.stack);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        message: error.message,
      });
    }
  }
};
