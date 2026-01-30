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
    // process.env.MONGO_URI comes from .env file
    // Example: mongodb://127.0.0.1:27017/event_booking?replicaSet=rs0
    await mongoose.connect(process.env.MONGO_URI);

    // ✅ Log success message when connected
    console.log("MongoDB connected");
  } catch (error) {
    // ❌ ERROR: If connection fails, log error and exit
    console.error("MongoDB connection failed:", error.message);
    // Exit with code 1 (error exit) - server won't start without database
    process.exit(1);
  }
};

// Export function so server.js can import and call it
module.exports = connectDB;
