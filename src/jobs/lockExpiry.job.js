const mongoose = require("mongoose");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");

const LOCK_EXPIRY_INTERVAL_MINUTES = 1;

/**
 * TASK 6.1 - Lock Expiry Worker
 *
 * Automatically expire stale seat locks and restore seats
 *
 * Acceptance Criteria:
 * ✅ Expired locks are released
 * ✅ Seats are restored
 */
async function expireLocks() {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    // 1️⃣ Find expired locks (status = ACTIVE, expiresAt < now)
    const expiredLocks = await SeatLock.find({
      status: "ACTIVE",
      expiresAt: { $lt: now },
    }).session(session);

    console.log(`[LOCK EXPIRY JOB] Found ${expiredLocks.length} expired locks`);

    if (expiredLocks.length === 0) {
      await session.commitTransaction();
      session.endSession();
      return;
    }

    for (const lock of expiredLocks) {
      // 2️⃣ Mark lock as EXPIRED
      lock.status = "EXPIRED";
      await lock.save({ session });

      // 3️⃣ Restore seats to the event
      await Event.findByIdAndUpdate(
        lock.eventId,
        { $inc: { availableSeats: lock.seats } },
        { session, new: true },
      );

      console.log(
        `[LOCK EXPIRY JOB] Expired lock ${lock._id}, restored ${lock.seats} seats to event ${lock.eventId}`,
      );
    }

    await session.commitTransaction();
    session.endSession();

    console.log(
      `[LOCK EXPIRY JOB] Successfully expired ${expiredLocks.length} locks`,
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("[LOCK EXPIRY JOB ERROR]", error.message);
  }
}

// Run every minute
setInterval(expireLocks, LOCK_EXPIRY_INTERVAL_MINUTES * 60 * 1000);

module.exports = expireLocks;
