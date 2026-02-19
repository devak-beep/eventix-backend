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
  updateEventImage, // Updates event image
  deleteEvent, // Deletes an event
} = require("../controllers/event.controller");

// Import auth middleware
const { requireAdmin } = require("../middlewares/auth.middleware");

// ROUTE 1: POST /api/events
// Purpose: Create a new event (Admin only)
// Handler: createEvent function
// Request body: {name, description, eventDate, totalSeats, type, userId, userRole}
// Response: {success: true, data: event}
router.post("/", requireAdmin, createEvent);

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

// ROUTE 4: PATCH /api/events/:eventId/image
// Purpose: Update event image (SuperAdmin can update any, Admin only their own)
// Handler: updateEventImage function
// URL parameter: eventId
// Request body: {userId, userRole, image}
// Response: {success: true, message, data}
router.patch("/:eventId/image", requireAdmin, updateEventImage);

// ROUTE 5: DELETE /api/events/:eventId
// Purpose: Delete an event (SuperAdmin can delete any, Admin only their own)
// Handler: deleteEvent function
// URL parameter: eventId
// Request body: {userId, userRole}
// Response: {success: true, message}
router.delete("/:eventId", requireAdmin, deleteEvent);

// Export router so app.js can use it
module.exports = router;
