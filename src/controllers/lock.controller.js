const mongoose = require("mongoose");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");

// GET all locks or filter by eventId, userId, or status
exports.getAllLocks = async (req, res) => {
  try {
    const { eventId, userId, status } = req.query;

    // Build filter based on query parameters
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const locks = await SeatLock.find(filter)
      .populate("eventId", "name totalSeats availableSeats")
      .populate("userId", "name email");

    res.status(200).json({
      success: true,
      data: locks,
      count: locks.length,
      filter: Object.keys(filter).length > 0 ? filter : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching locks",
      error: error.message,
    });
  }
};

exports.lockSeats = async (req, res) => {
  console.log("REQ BODY 👉", req.body);

  const { eventId } = req.params;
  const { userId, seats, idempotencyKey } = req.body;

  if (!eventId || !userId || !seats || !idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "Missing fields",
    });
  }

  const existingLock = await SeatLock.findOne({ idempotencyKey });
  if (existingLock) {
    return res.status(200).json({ 
      success: true, 
      lockId: existingLock._id,
      expiresAt: existingLock.expiresAt,
      data: existingLock 
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const event = await Event.findOneAndUpdate(
      { _id: eventId, availableSeats: { $gte: seats } },
      { $inc: { availableSeats: -seats } },
      { new: true, session },
    );

    if (!event) {
      throw new Error("Not enough seats available");
    }

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
      data: lock[0]
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Cancel a lock and restore seats
exports.cancelLock = async (req, res) => {
  const { lockId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lock = await SeatLock.findById(lockId).session(session);

    if (!lock) {
      await session.abortTransaction();
      session.endSession();
      // Return success for idempotency - lock doesn't exist, nothing to cancel
      return res.status(200).json({
        success: true,
        message: "Lock not found (already processed)",
        alreadyProcessed: true,
      });
    }

    // BUGFIX: If lock is not ACTIVE, return success (idempotent)
    // This prevents double seat restoration
    if (lock.status !== "ACTIVE") {
      await session.abortTransaction();
      session.endSession();
      console.log(
        `[CANCEL LOCK] Lock ${lockId} is ${lock.status}, skipping (idempotent)`,
      );
      return res.status(200).json({
        success: true,
        message: `Lock already ${lock.status} (idempotent)`,
        alreadyProcessed: true,
        lockStatus: lock.status,
      });
    }

    // Restore seats atomically with constraint check
    const event = await Event.findById(lock.eventId).session(session);
    if (event) {
      // Use constraint to prevent availableSeats > totalSeats
      const newAvailableSeats = Math.min(
        event.availableSeats + lock.seats,
        event.totalSeats,
      );
      event.availableSeats = newAvailableSeats;
      await event.save({ session });
      console.log(
        `[CANCEL LOCK] Restored ${lock.seats} seats for event ${lock.eventId}. New available: ${newAvailableSeats}`,
      );
    }

    // Mark lock as cancelled
    lock.status = "CANCELLED";
    await lock.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: "Lock cancelled" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("[CANCEL LOCK] Error:", error.message);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
