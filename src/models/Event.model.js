// ============================================
// EVENT MODEL - Database schema for events
// ============================================

const mongoose = require("mongoose");

// Define what fields an Event document should have
const eventSchema = new mongoose.Schema(
  {
    // FIELD: Event name
    name: {
      type: String,
      required: true, // Event must have a name
      trim: true, // Remove whitespace
    },

    // FIELD: Event description (optional, provides details about the event)
    description: {
      type: String,
      trim: true,
    },

    // FIELD: When the event happens (date and time)
    eventDate: {
      type: Date,
      required: true, // Event date is mandatory
      index: true, // Create database index for faster searches
    },

    // FIELD: Total number of seats available for this event
    totalSeats: {
      type: Number,
      required: true,
      // Validation: minimum 1 seat required
      min: [1, "Total seats must be at least 1"],
    },

    // FIELD: How many seats are still available (not booked/locked)
    // Decreases when users lock/book seats
    // Increases when locks/bookings expire
    availableSeats: {
      type: Number,
      required: true,
      // Validation: seats cannot be negative
      min: [0, "Available seats cannot be negative"],
      // Custom validation: available cannot exceed total
      validate: {
        validator: function (value) {
          return value <= this.totalSeats;
        },
        message: "Available seats cannot exceed total seats",
      },
    },

    // FIELD: Event type (public or private)
    // Public events are shown on home page
    // Private events can only be accessed by ID
    type: {
      type: String,
      enum: ["public", "private"], // Only these two values allowed
      default: "public", // Default to public if not specified
    },

    // FIELD: Event category
    category: {
      type: String,
      enum: [
        "food-drink",
        "sports-live",
        "arts-theater",
        "comedy-standup",
        "movies-premieres",
        "concerts-music",
      ],
      required: true,
    },

    // FIELD: Ticket price per seat (in smallest currency unit, e.g., cents/paise)
    // Store as integer to avoid floating point issues
    // For payment gateway integration
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },

    // FIELD: Currency code (ISO 4217)
    // Default to INR for Indian Rupees
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },

    // FIELD: Event creation charge (platform fee)
    creationCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    // FIELD: User who created this event
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // FIELD: Idempotency key for duplicate prevention
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls
    },
  },
  // Add automatic timestamps
  { timestamps: true },
);

// Create and export Event model
// MongoDB will create an "events" collection
module.exports = mongoose.model("Event", eventSchema);
