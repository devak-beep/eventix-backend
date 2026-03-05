// ============================================
// SEAT MANAGER - Utility for safe seat operations
// ============================================
// Prevents overselling and double restoration bugs

const Event = require("../models/Event.model");

/**
 * Safely restore seats to an event
 * Uses atomic update with constraint to prevent availableSeats > totalSeats
 *
 * @param {ObjectId} eventId - The event ID
 * @param {Number} seats - Number of seats to restore
 * @param {Object} session - MongoDB session for transaction
 * @returns {Object} { success: boolean, seatsRestored: number, event: Event }
 */
async function restoreSeats(eventId, seats, session = null) {
  const options = session ? { session, new: true } : { new: true };

  // First get the event to check constraints
  const event = await Event.findById(eventId).session(session);

  if (!event) {
    console.warn(`[SEAT MANAGER] Event ${eventId} not found`);
    return { success: false, seatsRestored: 0, event: null };
  }

  // Calculate how many seats we can actually restore without exceeding totalSeats
  const maxRestorable = event.totalSeats - event.availableSeats;
  const seatsToRestore = Math.min(seats, maxRestorable);

  if (seatsToRestore <= 0) {
    console.warn(
      `[SEAT MANAGER] Cannot restore ${seats} seats to event ${eventId} - already at max (${event.availableSeats}/${event.totalSeats})`,
    );
    return { success: false, seatsRestored: 0, event };
  }

  if (seatsToRestore < seats) {
    console.warn(
      `[SEAT MANAGER] Partial restore: requested ${seats}, restoring ${seatsToRestore} to prevent exceeding totalSeats`,
    );
  }

  // Use atomic findOneAndUpdate with constraint
  const updatedEvent = await Event.findOneAndUpdate(
    {
      _id: eventId,
      // Ensure we don't exceed totalSeats
      $expr: {
        $lte: [{ $add: ["$availableSeats", seatsToRestore] }, "$totalSeats"],
      },
    },
    { $inc: { availableSeats: seatsToRestore } },
    options,
  );

  if (!updatedEvent) {
    console.error(
      `[SEAT MANAGER] Failed to restore ${seatsToRestore} seats - constraint violated`,
    );
    return { success: false, seatsRestored: 0, event };
  }

  console.log(
    `[SEAT MANAGER] Restored ${seatsToRestore} seats to event ${eventId} (now ${updatedEvent.availableSeats}/${updatedEvent.totalSeats})`,
  );
  return { success: true, seatsRestored: seatsToRestore, event: updatedEvent };
}

/**
 * Safely deduct seats from an event
 * Uses atomic update with constraint to prevent negative availableSeats
 *
 * @param {ObjectId} eventId - The event ID
 * @param {Number} seats - Number of seats to deduct
 * @param {Object} session - MongoDB session for transaction
 * @returns {Object} { success: boolean, seatsDeducted: number, event: Event }
 */
async function deductSeats(eventId, seats, session = null) {
  const options = session ? { session, new: true } : { new: true };

  // Use atomic findOneAndUpdate with constraint
  const updatedEvent = await Event.findOneAndUpdate(
    {
      _id: eventId,
      availableSeats: { $gte: seats },
    },
    { $inc: { availableSeats: -seats } },
    options,
  );

  if (!updatedEvent) {
    console.warn(
      `[SEAT MANAGER] Cannot deduct ${seats} seats - not enough available`,
    );
    return { success: false, seatsDeducted: 0, event: null };
  }

  console.log(
    `[SEAT MANAGER] Deducted ${seats} seats from event ${eventId} (now ${updatedEvent.availableSeats}/${updatedEvent.totalSeats})`,
  );
  return { success: true, seatsDeducted: seats, event: updatedEvent };
}

/**
 * Fix corrupted event seat counts
 * Recalculates availableSeats based on active/consumed locks and confirmed bookings
 *
 * @param {ObjectId} eventId - The event ID to fix
 * @param {Object} session - MongoDB session for transaction
 * @returns {Object} { corrected: boolean, oldValue: number, newValue: number }
 */
async function fixEventSeats(eventId, session = null) {
  const SeatLock = require("../models/SeatLock.model");

  const event = await Event.findById(eventId).session(session);
  if (!event) {
    return { corrected: false, error: "Event not found" };
  }

  // Calculate locked seats from ACTIVE and CONSUMED locks
  const lockAggregate = await SeatLock.aggregate([
    {
      $match: {
        eventId: event._id,
        status: { $in: ["ACTIVE", "CONSUMED"] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$seats" },
      },
    },
  ]).session(session);

  const totalLockedSeats =
    lockAggregate.length > 0 ? lockAggregate[0].total : 0;
  const correctAvailableSeats = event.totalSeats - totalLockedSeats;

  if (event.availableSeats === correctAvailableSeats) {
    return {
      corrected: false,
      oldValue: event.availableSeats,
      newValue: correctAvailableSeats,
      message: "Already correct",
    };
  }

  const oldValue = event.availableSeats;
  event.availableSeats = correctAvailableSeats;
  await event.save({ session });

  console.log(
    `[SEAT MANAGER] Fixed event ${eventId}: ${oldValue} → ${correctAvailableSeats}`,
  );
  return { corrected: true, oldValue, newValue: correctAvailableSeats };
}

module.exports = {
  restoreSeats,
  deductSeats,
  fixEventSeats,
};
