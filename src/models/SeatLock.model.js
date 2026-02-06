// ============================================
// SEAT LOCK MODEL - Database schema for temporary seat reservations
// ============================================

const mongoose = require("mongoose");

// A SeatLock reserves seats temporarily while user completes payment
// After 5 minutes, if no booking created, the lock expires and seats are released
const seatLockSchema = new mongoose.Schema(
  {
    // FIELD: Which event these seats belong to
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event", // Foreign key reference to Event model
      required: true,
    },

    // FIELD: Which user locked these seats
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Foreign key reference to User model
      required: true,
    },

    // FIELD: How many seats are locked
    seats: {
      type: Number,
      required: true,
      min: 1, // At least 1 seat
    },

    // FIELD: Current status of this lock
    status: {
      type: String,
      // Can only be one of these values:
      enum: ["ACTIVE", "EXPIRED", "CONSUMED", "CANCELLED"],
      default: "ACTIVE",
    },
    // ACTIVE: Lock is valid, user can still make booking
    // EXPIRED: Lock time passed, job cleaned it up, seats released
    // CONSUMED: Lock was converted to a booking
    // CANCELLED: Booking was cancelled, seats released

    // FIELD: When this lock expires
    // If user doesn't complete booking by this time, lock becomes invalid
    expiresAt: {
      type: Date,
      required: true,
    },

    // FIELD: Unique identifier for idempotency (prevent duplicate locks)
    // If network fails and user retries, we use this to find existing lock
    idempotencyKey: {
      type: String,
      required: true,
      unique: true, // No two locks can have the same key
    },
  },
  { timestamps: true }, // Add createdAt and updatedAt fields
);

// Create database index on expiresAt for fast searches
// Background job searches for locks where expiresAt < current time
// This index makes that search very fast
seatLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Delete old model if it exists to prevent conflicts
if (mongoose.models.SeatLock) {
  delete mongoose.models.SeatLock;
}

// Create and export SeatLock model
// MongoDB will create a "seatlocks" collection
module.exports = mongoose.model("SeatLock", seatLockSchema);
