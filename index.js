require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

let isConnected = false;

module.exports = async (req, res) => {
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
      message: error.message 
    });
  }
};
