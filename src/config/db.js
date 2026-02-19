// ============================================
// DATABASE CONNECTION SETUP
// Connects the app to MongoDB database
// ============================================

// Import Mongoose - MongoDB database driver for Node.js
const mongoose = require("mongoose");

/**
 * FUNCTION: Connect to MongoDB
 * Purpose: Establish connection to MongoDB database on server startup
 * Called by: server.js in the startServer() function
 * Uses: MONGO_URI from .env file
 */
const connectDB = async () => {
  try {
    // ✅ CONNECT: Use Mongoose to connect to MongoDB
    // Timeout set to 5s so Vercel (10s limit) can return a proper error before being killed
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // fail fast if Atlas unreachable
      connectTimeoutMS: 5000,
    });

    // ✅ Log success message when connected
    console.log("MongoDB connected successfully");
  } catch (error) {
    // ❌ ERROR: If connection fails, log error and throw
    console.error("MongoDB connection failed:", error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

// Export function so server.js can import and call it
module.exports = connectDB;
