// Script to promote a user to superAdmin
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User.model");

const promoteToSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // User ID to promote
    const userId = "6992ef62dfb58ffae854b9b0";

    // Update user role to superAdmin
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { role: "superAdmin" },
      { new: true },
    );

    if (updatedUser) {
      console.log("\n✅ User successfully promoted to superAdmin:");
      console.log(`  Email: ${updatedUser.email}`);
      console.log(`  Role: ${updatedUser.role}`);
      console.log(`  Name: ${updatedUser.name}`);
    } else {
      console.log("❌ User not found");
    }

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  } catch (error) {
    console.error("Error promoting user:", error.message);
    process.exit(1);
  }
};

promoteToSuperAdmin();
