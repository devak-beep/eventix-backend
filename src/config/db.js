// ============================================
// DATABASE CONNECTION SETUP
// Connects the app to MongoDB database
// ============================================

// Import Mongoose - MongoDB database driver for Node.js
const mongoose = require("mongoose");

// Disable buffering globally for serverless
mongoose.set('bufferCommands', false);

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

  // If connecting, wait for it
  if (mongoose.connection.readyState === 2) {
    console.log("MongoDB connection in progress, waiting...");
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);
      mongoose.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    return;
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

// Export function so server.js can import and call it
module.exports = connectDB;
