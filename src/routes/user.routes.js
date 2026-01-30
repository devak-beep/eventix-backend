// ============================================
// USER ROUTES - API endpoints for user operations
// ============================================

// Import Express router library
const express = require("express");
// Create a router instance to define routes
const router = express.Router();

// Import controller functions that handle requests
const { registerUser, getUserById } = require("../controllers/user.controller");

// ROUTE 1: POST /api/users/register
// Purpose: Create a new user account
// Handler: registerUser function
// Request body: {name, email, password, role}
// Response: {success: true, data: {_id, name, email, role}}
router.post("/register", registerUser);

// ROUTE 2: GET /api/users/:id
// Purpose: Get user information by ID
// Handler: getUserById function
// URL parameter: id (user's MongoDB ID)
// Response: {success: true, data: user}
router.get("/:id", getUserById);

// Export router so app.js can use it
module.exports = router;
