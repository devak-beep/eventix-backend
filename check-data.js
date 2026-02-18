// Script to check admin requests and user data
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User.model");
const AdminRequest = require("./src/models/AdminRequest.model");

const checkData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB\n");

    // Check all users
    const allUsers = await User.find();
    console.log("📋 ALL USERS:");
    allUsers.forEach((user) => {
      console.log(`  - ${user.name} (${user.email}): role="${user.role}"`);
    });

    console.log("\n📋 ALL ADMIN REQUESTS:");
    const allRequests = await AdminRequest.find().sort({ createdAt: -1 });
    if (allRequests.length === 0) {
      console.log("  ❌ NO ADMIN REQUESTS FOUND");
    } else {
      allRequests.forEach((req) => {
        console.log(
          `  - ${req.email}: status="${req.status}" (created: ${req.createdAt})`,
        );
      });
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

checkData();
