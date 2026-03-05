require("dotenv").config();
const mongoose = require("mongoose");

// Disable buffering globally BEFORE any models are loaded
mongoose.set('bufferCommands', false);

let app = null;
let isConnecting = false;

async function ensureConnection() {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return true;
  }

  // Connection in progress, wait for it
  if (isConnecting) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 15000);
    });
    return mongoose.connection.readyState === 1;
  }

  // Start new connection
  isConnecting = true;
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not found in environment");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    
    isConnecting = false;
    return true;
  } catch (error) {
    isConnecting = false;
    console.error("MongoDB connection error:", error.message);
    return false;
  }
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
    // Ensure database connection
    const connected = await ensureConnection();
    if (!connected) {
      return res.status(503).json({
        success: false,
        message: "Database connection failed",
        error: "Service temporarily unavailable"
      });
    }

    // Load app once (AFTER DB is connected)
    if (!app) {
      app = require("./src/app");
    }

    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        message: error.message,
      });
    }
  }
};
