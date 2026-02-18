// Script to verify user role in MongoDB
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User.model");

const checkUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // User ID to check
    const userId = "6992ef62dfb58ffae854b9b0";

    // Find and display user
    const user = await User.findById(userId);

    if (user) {
      console.log("\n📋 Current User Data:");
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log("❌ User not found");
    }

    // Close MongoDB connection
    await mongoose.connection.close();
  } catch (error) {
    console.error("Error checking user:", error.message);
    process.exit(1);
  }
};

checkUser();
