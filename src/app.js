// ============================================
// EXPRESS APP CONFIGURATION
// Sets up Express server with routes and middleware
// ============================================

// Import Express framework
const express = require("express");
// Import middleware for automatic error handling in async functions
// Without this, errors in async functions would crash the server
require("express-async-errors");

// Import all route files
const userRoutes = require("./routes/user.routes"); // User registration/retrieval routes
const eventRoutes = require("./routes/event.routes"); // Event creation/retrieval routes
const lockRoutes = require("./routes/lock.routes"); // Seat locking routes
const bookingRoutes = require("./routes/booking.routes"); // Booking confirmation routes

// Create Express app instance
const app = express();

// MIDDLEWARE: Enable JSON parsing
// This allows the server to read JSON from request bodies
// Example: POST /api/users/register with {"name": "John"}
app.use(express.json());

// REGISTER ROUTES: Mount route handlers at different API endpoints
// Example: POST /api/users/register → handled by userRoutes
app.use("/api/users", userRoutes); // Routes: POST /register, GET /:id
app.use("/api/events", eventRoutes); // Routes: POST /, GET /:id, POST /:eventId/lock
app.use("/api/locks", lockRoutes); // Route: POST /
app.use("/api/bookings", bookingRoutes); // Routes: POST /confirm, POST /:id/confirm
app.use("/api/payments", require("./routes/payment.routes")); // Route: POST /intent

// HEALTH CHECK ENDPOINT
// GET /health → {"status": "OK"}
// Used to check if server is running without any errors
// DevOps tools use this to monitor server health
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Export app so server.js can use it
module.exports = app;
