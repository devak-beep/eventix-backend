// ============================================
// USER ROUTES - API endpoints for user operations
// ============================================

// Import Express router library
const express = require("express");
// Create a router instance to define routes
const router = express.Router();

// Import controller functions that handle requests
const {
  registerUser,
  loginUser,
  getUserById,
  getAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
} = require("../controllers/user.controller");

// Import middleware for superAdmin routes
const { requireSuperAdmin } = require("../middlewares/auth.middleware");

// ROUTE 1: POST /api/users/register
// Purpose: Create a new user account
// Handler: registerUser function
// Request body: {name, email, password, role}
// Response: {success: true, data: {_id, name, email, role}}
router.post("/register", registerUser);

// ROUTE 2: POST /api/users/login
// Purpose: Login with email and password
// Handler: loginUser function
// Request body: {email, password}
// Response: {success: true, data: user}
router.post("/login", loginUser);

// ROUTE 3: GET /api/users/:id
// Purpose: Get user information by ID
// Handler: getUserById function
// URL parameter: id (user's MongoDB ID)
// Response: {success: true, data: user}
router.get("/:id", getUserById);

// ROUTE 4: GET /api/users/admin-requests/pending
// Purpose: Get all pending admin requests (super admin only)
// Handler: getAdminRequests function
// Middleware: requireSuperAdmin - protects route from non-superAdmin users
// Response: {success: true, data: [requests]}
router.get("/admin-requests/pending", requireSuperAdmin, getAdminRequests);

// ROUTE 5: POST /api/users/admin-requests/:requestId/approve
// Purpose: Approve an admin request (super admin only)
// Handler: approveAdminRequest function
// Middleware: requireSuperAdmin - protects route from non-superAdmin users
// Request body: {rejectionReason (optional)}
// Response: {success: true, data: updatedRequest}
router.post(
  "/admin-requests/:requestId/approve",
  requireSuperAdmin,
  approveAdminRequest,
);

// ROUTE 6: POST /api/users/admin-requests/:requestId/reject
// Purpose: Reject an admin request (super admin only)
// Handler: rejectAdminRequest function
// Middleware: requireSuperAdmin - protects route from non-superAdmin users
// Request body: {rejectionReason}
// Response: {success: true, data: rejectedRequest}
router.post(
  "/admin-requests/:requestId/reject",
  requireSuperAdmin,
  rejectAdminRequest,
);

// Export router so app.js can use it
module.exports = router;
