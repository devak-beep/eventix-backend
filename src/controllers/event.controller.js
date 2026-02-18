const mongoose = require("mongoose");
const Event = require("../models/Event.model");
const SeatLock = require("../models/SeatLock.model");

/**
 * Create a new event
 * NOTE: This endpoint should NOT be used directly for event creation during payment flow.
 * Use verifyEventPayment in razorpay.controller.js instead to ensure payment is verified first.
 * This endpoint is kept for backward compatibility and admin direct creation only.
 */
exports.createEvent = async (req, res) => {
  const {
    name,
    description,
    eventDate,
    totalSeats,
    type,
    category,
    amount,
    currency,
    idempotencyKey,
    image,
    paymentVerified,
  } = req.body;

  // Safety check: if paymentVerified is not explicitly true, require payment to be made through Razorpay
  // This prevents accidental event creation without payment
  if (!paymentVerified && amount > 0) {
    return res.status(403).json({
      success: false,
      message:
        "Event creation requires payment verification. Please use the payment flow.",
    });
  }

  if (!name || !eventDate || !totalSeats || !category || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: "name, eventDate, totalSeats, category, and amount are required",
    });
  }

  // Idempotency check
  if (idempotencyKey) {
    const existingEvent = await Event.findOne({ idempotencyKey });
    if (existingEvent) {
      return res.status(200).json({
        success: true,
        data: existingEvent,
        creationCharge: existingEvent.creationCharge,
        message: `Event already created (idempotent). Creation charge: ₹${existingEvent.creationCharge}`,
        isRetry: true,
      });
    }
  }

  // Validate amount
  if (amount < 0) {
    return res.status(400).json({
      success: false,
      message: "Amount cannot be negative",
    });
  }

  // Validate event date is in the future
  const selectedDate = new Date(eventDate);
  const now = new Date();
  if (selectedDate <= now) {
    return res.status(400).json({
      success: false,
      message: "Event date and time must be in the future",
    });
  }

  // Validate description
  if (description && description.trim().length > 1500) {
    return res.status(400).json({
      success: false,
      message: "Description must not exceed 1500 characters",
    });
  }

  // Calculate event creation charge based on scale
  let creationCharge = 0;
  if (totalSeats <= 50) {
    creationCharge = 500;
  } else if (totalSeats <= 100) {
    creationCharge = 1000;
  } else if (totalSeats <= 200) {
    creationCharge = 1500;
  } else if (totalSeats <= 500) {
    creationCharge = 2500;
  } else {
    creationCharge = 5000;
  }

  const event = await Event.create({
    name,
    description: description ? description.trim() : "",
    eventDate,
    totalSeats,
    availableSeats: totalSeats,
    type: type || "public", // Default to public
    category,
    amount,
    currency: currency || "INR",
    creationCharge,
    createdBy: req.body.userId, // Store who created the event
    idempotencyKey: idempotencyKey || null,
    image: image || null, // Store base64 image
  });

  res.status(201).json({
    success: true,
    data: event,
    creationCharge,
    message: `Event created successfully. Creation charge: ₹${creationCharge}`,
  });
};

/**
 * Get all public events (or all events for admin)
 */
exports.getAllPublicEvents = async (req, res) => {
  const { userRole } = req.query;

  // Admin and superAdmin see all events (public + private), users see only public
  const filter =
    userRole === "admin" || userRole === "superAdmin" ? {} : { type: "public" };

  const events = await Event.find(filter)
    .select(
      "name description eventDate totalSeats availableSeats type category amount currency image createdAt",
    )
    .sort({ eventDate: 1 }); // Sort by event date (earliest first)

  res.status(200).json({
    success: true,
    data: events,
  });
};

/**
 * Get events created by a specific user
 */
exports.getMyEvents = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required",
    });
  }

  const events = await Event.find({ createdBy: userId })
    .select(
      "name description eventDate totalSeats availableSeats type category amount currency creationCharge createdAt",
    )
    .sort({ createdAt: -1 }); // Sort by creation date (newest first)

  res.status(200).json({
    success: true,
    data: events,
    count: events.length,
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

  const event = await Event.findById(id)
    .populate("createdBy", "name email")
    .select(
      "name description eventDate totalSeats availableSeats amount currency image createdAt createdBy",
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
