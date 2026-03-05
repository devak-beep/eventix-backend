require("dotenv").config();
const mongoose = require("mongoose");

// Disable buffering globally FIRST
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 5000);

let app = null;
let isReady = false;

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
    // Ensure connection and app are ready
    if (!isReady) {
      // Connect first
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
        });
      }
      
      // Then load app (which loads models)
      if (!app) {
        app = require("./src/app");
      }
      
      isReady = true;
    }

    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error.message);
    isReady = false; // Reset on error
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        message: error.message,
      });
    }
  }
};
