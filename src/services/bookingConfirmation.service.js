const mongoose = require("mongoose");
const SeatLock = require("../models/SeatLock.model");
const Booking = require("../models/Booking.model");
const Event = require("../models/Event.model");
const { BOOKING_STATUS } = require("../utils/bookingStateMachine");
const { logBookingStateChange } = require("../utils/logger");

// ========== Called after seat lock is created ==========
async function confirmBookingTransactional(lockId, correlationId = null) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Validate lock
    const lock = await SeatLock.findById(lockId).session(session);

    if (!lock) {
      throw new Error("INVALID_OR_EXPIRED_LOCK");
    }

    // 2️⃣ Check lock expiry
    if (lock.expiresAt < new Date()) {
      // Release seats back to event
      const event = await Event.findById(lock.eventId).session(session);
      if (event) {
        event.availableSeats += lock.seats;
        event.availableSeats = Math.min(event.availableSeats, event.totalSeats);
        await event.save({ session });
      }

      await SeatLock.deleteOne({ _id: lockId }).session(session);
      throw new Error("LOCK_EXPIRED");
    }

    // 3️⃣ Idempotency check (IMPORTANT)
    const existingBooking = await Booking.findOne({
      seatLockId: lockId,
    }).session(session);

    if (existingBooking) {
      await session.commitTransaction();
      session.endSession();
      return existingBooking;
    }

    // 4️⃣ Create booking with PAYMENT_PENDING status
    const booking = await Booking.create(
      [
        {
          event: lock.eventId,
          user: lock.userId,
          seats: Array.from({ length: lock.seats }, (_, i) => `SEAT-${i + 1}`),
          seatLockId: lockId,
          status: BOOKING_STATUS.PAYMENT_PENDING,
          paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      ],
      { session },
    );

    // 5️⃣ Keep seat lock ACTIVE (will be marked CONSUMED on payment success)
    // or EXPIRED on payment failure/timeout

    await session.commitTransaction();
    session.endSession();

    // Log booking creation
    await logBookingStateChange(
      booking[0]._id,
      null,
      BOOKING_STATUS.PAYMENT_PENDING,
      lock.userId,
      correlationId,
      lock.eventId,
      'BOOKING_CREATED'
    );

    return booking[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = {
  confirmBookingTransactional,
};
