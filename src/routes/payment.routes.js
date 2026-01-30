// ============================================
// PAYMENT ROUTES - API endpoints for payment processing
// ============================================

// Import Express router
const express = require("express");
// Create router instance
const router = express.Router();

// Import payment controller
const { createPaymentIntent } = require("../controllers/payment.controller");

// ROUTE: POST /api/payments/intent
// Purpose: Create a payment intent (simulate payment)
// Handler: createPaymentIntent function
// Request body: {bookingId, force: "success" | "failure" | "timeout"}
// Response: {success: true, paymentStatus}
// What happens:
// - force: "success" → Payment succeeds, booking confirmed
// - force: "failure" → Payment fails, booking marked failed
// - force: "timeout" → Payment times out, expiry job cleans it up
router.post("/intent", createPaymentIntent);

// Export router so app.js can use it
module.exports = router;
