const mongoose = require("mongoose");
const Booking = require("../models/Booking.model");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");
const { BOOKING_STATUS } = require("../utils/bookingStateMachine");

const BOOKING_EXPIRY_INTERVAL_MINUTES = 1;

/**
 * TASK 6.2 - Booking Expiry Worker
 *
 * Automatically expire unpaid bookings and release associated locks
 *
 * Acceptance Criteria:
 * ✅ Booking marked EXPIRED
 * ✅ Associated locks released
 */
async function expireBookings() {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    // 1️⃣ Find expired bookings (PAYMENT_PENDING past paymentExpiresAt)
    const expiredBookings = await Booking.find({
      status: BOOKING_STATUS.PAYMENT_PENDING,
      paymentExpiresAt: { $lt: now },
    }).session(session);

    console.log(
      `[BOOKING EXPIRY JOB] Found ${expiredBookings.length} expired bookings`,
    );

    if (expiredBookings.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return;
    }

    for (const booking of expiredBookings) {
      // 2️⃣ Mark booking as EXPIRED
      booking.status = BOOKING_STATUS.EXPIRED;
      await booking.save({ session });

      // 3️⃣ Release associated lock if exists
      if (booking.seatLockId) {
        const lock = await SeatLock.findById(booking.seatLockId).session(
          session,
        );

        if (lock && lock.status === "ACTIVE") {
          // 3a️⃣ Mark lock as EXPIRED
          lock.status = "EXPIRED";
          await lock.save({ session });

          // 3b️⃣ Restore seats to the event
          await Event.findByIdAndUpdate(
            lock.eventId,
            { $inc: { availableSeats: lock.seats } },
            { session, new: true },
          );

          console.log(
            `[BOOKING EXPIRY JOB] Expired booking ${booking._id}, expired lock ${lock._id}, restored ${lock.seats} seats`,
          );
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    console.log(
      `[BOOKING EXPIRY JOB] Successfully expired ${expiredBookings.length} bookings`,
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("[BOOKING EXPIRY JOB ERROR]", error.message);
  }
}

// Run every minute
setInterval(expireBookings, BOOKING_EXPIRY_INTERVAL_MINUTES * 60 * 1000);

module.exports = expireBookings;
