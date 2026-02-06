const mongoose = require("mongoose");
const Event = require("../models/Event.model");
const SeatLock = require("../models/SeatLock.model");

/**
 * Create a new event
 */
exports.createEvent = async (req, res) => {
  const { name, description, eventDate, totalSeats, type, category } = req.body;

  if (!name || !eventDate || !totalSeats || !category) {
    return res.status(400).json({
      success: false,
      message: "name, eventDate, totalSeats, and category are required",
    });
  }

  // Validate description
  if (description && description.trim().length > 1500) {
    return res.status(400).json({
      success: false,
      message: "Description must not exceed 1500 characters",
    });
  }

  const event = await Event.create({
    name,
    description: description ? description.trim() : '',
    eventDate,
    totalSeats,
    availableSeats: totalSeats,
    type: type || "public", // Default to public
    category,
  });

  res.status(201).json({
    success: true,
    data: event,
  });
};

/**
 * Get all public events
 */
exports.getAllPublicEvents = async (req, res) => {
  const events = await Event.find({ type: "public" })
    .select("name description eventDate totalSeats availableSeats type category createdAt")
    .sort({ eventDate: 1 }); // Sort by event date (earliest first)

  res.status(200).json({
    success: true,
    data: events,
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

/**
 * Lock seats (EPIC 3 – Task 3.2 + 3.3)
 */
exports.lockSeats = async (req, res) => {
  const { eventId } = req.params;
  const { seats, userId, idempotencyKey } = req.body;

  if (!seats || seats <= 0 || !userId || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "seats, userId, and idempotencyKey are required",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Idempotency check
    const existingLock = await SeatLock.findOne({
      eventId,
      idempotencyKey,
    }).session(session);

    if (existingLock) {
      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        success: true,
        lockId: existingLock._id,
        expiresAt: existingLock.expiresAt,
        message: "Idempotent replay",
      });
    }

    const event = await Event.findById(eventId).session(session);

    if (!event) {
      throw new Error("Event not found");
    }

    if (event.availableSeats < seats) {
      throw new Error("Not enough seats available");
    }

    // Deduct seats
    event.availableSeats -= seats;
    await event.save({ session });

    // Create seat lock
    const lock = await SeatLock.create(
      [
        {
          eventId,
          userId,
          seats,
          idempotencyKey,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      lockId: lock[0]._id,
      expiresAt: lock[0].expiresAt,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
