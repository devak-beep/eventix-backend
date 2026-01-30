// ============================================
// BOOKING MODEL - Database schema for bookings
// ============================================

const mongoose = require("mongoose");

// Define all possible booking statuses
const BOOKING_STATUS = {
  INITIATED: "INITIATED", // Booking just started (lock created)
  PAYMENT_PENDING: "PAYMENT_PENDING", // Waiting for payment
  CONFIRMED: "CONFIRMED", // Payment received, booking confirmed
  CANCELLED: "CANCELLED", // User cancelled the booking
  EXPIRED: "EXPIRED", // Payment time expired
  FAILED: "FAILED", // Payment failed
};

const bookingSchema = new mongoose.Schema(
  {
    // FIELD: Which user made this booking
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // FIELD: Which event is being booked
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // FIELD: Idempotency key for duplicate prevention
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls (for optional field)
    },

    // FIELD: Seat numbers (array of seat identifiers)
    // Example: ["A1", "A2", "A3"]
    seats: {
      type: [String], // Array of strings
      required: true,
    },

    // FIELD: Current booking status
    status: {
      type: String,
      // Can only be one of the BOOKING_STATUS values
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.INITIATED,
    },

    // FIELD: Link to the SeatLock that reserved these seats
    seatLockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SeatLock",
      unique: true, // Each booking has one lock, each lock has one booking
    },

    // FIELD: When must payment be completed
    // If payment not made by this time, booking expires
    paymentExpiresAt: {
      type: Date,
      required: false, // Optional field
    },
  },
  { timestamps: true }, // Add createdAt and updatedAt fields
);

// Create and export Booking model
// MongoDB will create a "bookings" collection
module.exports = mongoose.model("Booking", bookingSchema);
