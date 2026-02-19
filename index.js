require("dotenv").config();

let app = null;
let connectDB = null;
let isConnected = false;

// Move ALL requires inside handler so any crash surfaces as JSON, not FUNCTION_INVOCATION_FAILED
module.exports = async (req, res) => {
  try {
    if (!app) {
      app = require("./src/app");
      connectDB = require("./src/config/db");
    }

    if (!isConnected) {
      await connectDB();
      isConnected = true;
      console.log("Database connected in serverless function");
    }

    return app(req, res);
  } catch (error) {
    console.error("Serverless function error:", error);
    // Always return JSON so we can read the real error
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Startup or runtime error",
        message: error.message,
        stack: error.stack,
      });
    }
  }
};
