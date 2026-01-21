const mongoose = require("mongoose");
const Event = require("../models/Event.model");

/**
 * Create a new event
 */
exports.createEvent = async (req, res) => {
  const { name, description, eventDate, totalSeats } = req.body;

  if (!name || !eventDate || !totalSeats) {
    return res.status(400).json({
      success: false,
      message: "name, eventDate and totalSeats are required",
    });
  }

  const event = await Event.create({
    name,
    description,
    eventDate,
    totalSeats,
    availableSeats: totalSeats,
  });

  res.status(201).json({
    success: true,
    data: event,
  });
};

/**
 * Get event details by ID
 */
exports.getEventById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid event ID",
    });
  }

  const event = await Event.findById(id).select(
    "name description eventDate totalSeats availableSeats createdAt",
  );

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  res.status(200).json({
    success: true,
    data: event,
  });
};
