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
  // Skip if already connected (important for serverless)
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error; // Don't exit in serverless
  }
};

// Export function so server.js can import and call it
module.exports = connectDB;
