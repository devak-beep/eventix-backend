// ============================================
// EVENT ROUTES - API endpoints for event operations
// ============================================

// Import Express router
const express = require("express");
// Create router instance
const router = express.Router();

// Import controller functions
const {
  createEvent, // Creates a new event
  getEventById, // Fetches event by ID
  getAllPublicEvents, // Fetches all public events
  getMyEvents, // Fetches user's created events
  lockSeats, // Locks seats for an event
} = require("../controllers/event.controller");

// ROUTE 1: POST /api/events
// Purpose: Create a new event
// Handler: createEvent function
// Request body: {name, description, eventDate, totalSeats, type}
// Response: {success: true, data: event}
router.post("/", createEvent);

// ROUTE 2: GET /api/events
// Purpose: Get all public events
// Handler: getAllPublicEvents function
// Response: {success: true, data: [events]}
router.get("/", getAllPublicEvents);

// ROUTE 2.5: GET /api/events/my-events
// Purpose: Get events created by user
// Handler: getMyEvents function
// Query param: userId
// Response: {success: true, data: [events]}
router.get("/my-events", getMyEvents);

// ROUTE 3: GET /api/events/:id
// Purpose: Get event details by ID
// Handler: getEventById function
// URL parameter: id (event's MongoDB ID)
// Response: {success: true, data: event}
router.get("/:id", getEventById);

// ROUTE 3: POST /api/events/:eventId/lock
// Purpose: Lock seats for an event (reserve seats while user pays)
// Handler: lockSeats function
// URL parameter: eventId
// Request body: {seats, idempotencyKey}
// Response: {success: true, lockId, expiresAt}
router.post("/:eventId/lock", lockSeats);

// Export router so app.js can use it
module.exports = router;
