const mongoose = require("mongoose");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");
const JobExecution = require("../models/JobExecution.model");

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
  // 1️⃣ Job safety check - prevent duplicate execution
  const existingJob = await JobExecution.findOne({
    jobType: "EXPIRE_LOCKS",
    status: "RUNNING",
  });

  if (existingJob) {
    console.log("[LOCK EXPIRY JOB] Another instance is already running, skipping...");
    return;
  }

  // 2️⃣ Create job execution record
  const jobExecution = await JobExecution.create({
    jobType: "EXPIRE_LOCKS",
    status: "RUNNING",
    startedAt: new Date(),
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const now = new Date();

    // 3️⃣ Find expired locks (status = ACTIVE, expiresAt < now)
    const expiredLocks = await SeatLock.find({
      status: "ACTIVE",
      expiresAt: { $lt: now },
    }).session(session);

    console.log(`[LOCK EXPIRY JOB] Found ${expiredLocks.length} expired locks`);

    let processed = 0;
    let errors = 0;

    if (expiredLocks.length === 0) {
      await session.commitTransaction();
      session.endSession();
      
      // Mark job as completed
      jobExecution.status = "COMPLETED";
      jobExecution.completedAt = new Date();
      jobExecution.results = { processed: 0, errors: 0, details: "No expired locks found" };
      await jobExecution.save();
      return;
    }

    for (const lock of expiredLocks) {
      try {
        // 4️⃣ Mark lock as EXPIRED
        lock.status = "EXPIRED";
        await lock.save({ session });

        // 5️⃣ Restore seats to the event
        await Event.findByIdAndUpdate(
          lock.eventId,
          { $inc: { availableSeats: lock.seats } },
          { session, new: true },
        );

        processed++;
        console.log(
          `[LOCK EXPIRY JOB] Expired lock ${lock._id}, restored ${lock.seats} seats to event ${lock.eventId}`,
        );
      } catch (error) {
        errors++;
        console.error(`[LOCK EXPIRY JOB] Error processing lock ${lock._id}:`, error.message);
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
      details: `Processed ${processed} locks, ${errors} errors` 
    };
    await jobExecution.save();

    console.log(
      `[LOCK EXPIRY JOB] Successfully expired ${processed} locks, ${errors} errors`,
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
    
    console.error("[LOCK EXPIRY JOB ERROR]", error.message);
  }
}

// Run every minute
setInterval(expireLocks, LOCK_EXPIRY_INTERVAL_MINUTES * 60 * 1000);

module.exports = expireLocks;
