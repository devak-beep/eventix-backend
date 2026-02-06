const mongoose = require("mongoose");
const Booking = require("../models/Booking.model");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");
const JobExecution = require("../models/JobExecution.model");
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
  // 1️⃣ Job safety check - prevent duplicate execution
  const existingJob = await JobExecution.findOne({
    jobType: "EXPIRE_BOOKINGS",
    status: "RUNNING",
  });

  if (existingJob) {
    console.log("[BOOKING EXPIRY JOB] Another instance is already running, skipping...");
    return;
  }

  // 2️⃣ Create job execution record
  const jobExecution = await JobExecution.create({
    jobType: "EXPIRE_BOOKINGS",
    status: "RUNNING",
    startedAt: new Date(),
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    // 3️⃣ Find expired bookings (PAYMENT_PENDING past paymentExpiresAt)
    const expiredBookings = await Booking.find({
      status: BOOKING_STATUS.PAYMENT_PENDING,
      paymentExpiresAt: { $lt: now },
    }).session(session);

    console.log(
      `[BOOKING EXPIRY JOB] Found ${expiredBookings.length} expired bookings`,
    );

    let processed = 0;
    let errors = 0;

    if (expiredBookings.length === 0) {
      await session.commitTransaction();
      session.endSession();
      
      // Mark job as completed
      jobExecution.status = "COMPLETED";
      jobExecution.completedAt = new Date();
      jobExecution.results = { processed: 0, errors: 0, details: "No expired bookings found" };
      await jobExecution.save();
      return;
    }

    for (const booking of expiredBookings) {
      try {
        // 4️⃣ Mark booking as EXPIRED with potential refund
        booking.status = BOOKING_STATUS.EXPIRED;
        
        // If booking has amount, assume payment might have been charged
        if (booking.amount && booking.amount > 0) {
          booking.refundAmount = booking.amount; // Issue refund for timeout
          console.log(`[BOOKING EXPIRY JOB] Issuing refund of ${booking.amount} for timed-out booking ${booking._id}`);
        }
        
        await booking.save({ session });

        // 5️⃣ Release associated lock if exists
        if (booking.seatLockId) {
          const lock = await SeatLock.findById(booking.seatLockId).session(
            session,
          );

          if (lock && lock.status === "ACTIVE") {
            // 5a️⃣ Mark lock as EXPIRED
            lock.status = "EXPIRED";
            await lock.save({ session });

            // 5b️⃣ Restore seats to the event
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

        processed++;
      } catch (error) {
        errors++;
        console.error(`[BOOKING EXPIRY JOB] Error processing booking ${booking._id}:`, error.message);
      }
    }

    await session.commitTransaction();
    session.endSession();

    // Mark job as completed
    jobExecution.status = "COMPLETED";
    jobExecution.completedAt = new Date();
    jobExecution.results = { 
      processed, 
      errors, 
      details: `Processed ${processed} bookings, ${errors} errors` 
    };
    await jobExecution.save();

    console.log(
      `[BOOKING EXPIRY JOB] Successfully expired ${processed} bookings, ${errors} errors`,
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    // Mark job as failed
    jobExecution.status = "FAILED";
    jobExecution.completedAt = new Date();
    jobExecution.results = { 
      processed: 0, 
      errors: 1, 
      details: error.message 
    };
    await jobExecution.save();
    
    console.error("[BOOKING EXPIRY JOB ERROR]", error.message);
  }
}

// Run every minute
setInterval(expireBookings, BOOKING_EXPIRY_INTERVAL_MINUTES * 60 * 1000);

module.exports = { expireBookings };
