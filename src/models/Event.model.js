const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    eventDate: {
      type: Date,
      required: true,
      index: true, // ✅ required by acceptance criteria
    },

    totalSeats: {
      type: Number,
      required: true,
      min: [1, "Total seats must be at least 1"],
    },

    availableSeats: {
      type: Number,
      required: true,
      min: [0, "Available seats cannot be negative"],
      validate: {
        validator: function (value) {
          return value <= this.totalSeats;
        },
        message: "Available seats cannot exceed total seats",
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Event", eventSchema);
