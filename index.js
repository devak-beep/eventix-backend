require("dotenv").config();

// Wrap app load in try/catch so module errors surface as JSON
// instead of Vercel's opaque FUNCTION_INVOCATION_FAILED
let app;
let appLoadError = null;
try {
  app = require("./src/app");
} catch (e) {
  appLoadError = e;
  console.error("[STARTUP] App failed to load:", e.message, e.stack);
}

const connectDB = require("./src/config/db");

let isConnected = false;

module.exports = async (req, res) => {
  // Return the actual load error so we can diagnose it
  if (appLoadError) {
    return res.status(500).json({
      error: "App initialization failed",
      message: appLoadError.message,
      stack: appLoadError.stack,
    });
  }

  try {
    // Connect to database on first request
    if (!isConnected) {
      await connectDB();
      isConnected = true;
      console.log("Database connected in serverless function");
    }

    // Handle the request with Express app
    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};
