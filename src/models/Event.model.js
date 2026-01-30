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
  },
  // Add automatic timestamps
  { timestamps: true },
);

// Create and export Event model
// MongoDB will create an "events" collection
module.exports = mongoose.model("Event", eventSchema);
