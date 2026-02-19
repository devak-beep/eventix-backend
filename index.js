require("dotenv").config();

let app = null;
let connectDB = null;
let isConnected = false;

module.exports = async (req, res) => {
  try {
    // Lazy-load app and db on first request (keeps cold start inside try/catch)
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
    console.error("Serverless function error:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Server error",
        message: error.message,
      });
    }
  }
};
