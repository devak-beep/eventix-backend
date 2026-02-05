const Booking = require("../models/Booking.model");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");
const {
  BOOKING_STATUS,
  canTransition,
} = require("../utils/bookingStateMachine");
const mongoose = require("mongoose");

// ========== BOOKING CANCELLATION API ==========
exports.cancelBooking = async (req, res) => {
  const { bookingId } = req.params;
  const correlationId = req.headers["x-correlation-id"] || `cancel-${Date.now()}`;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Fetch booking
    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // 2️⃣ Only CONFIRMED bookings can be cancelled
    if (!canTransition(booking.status, BOOKING_STATUS.CANCELLED)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking in ${booking.status} state. Only CONFIRMED bookings can be cancelled.`,
      });
    }

    // 3️⃣ Calculate 50% refund
    const originalAmount = booking.amount || 0;
    const refundAmount = Math.floor(originalAmount * 0.5); // 50% refund
    const cancellationFee = originalAmount - refundAmount;

    // 4️⃣ Update booking to CANCELLED
    booking.status = BOOKING_STATUS.CANCELLED;
    booking.refundAmount = refundAmount;
    await booking.save({ session });

    // 5️⃣ Restore seats to event inventory
    if (booking.seatLockId) {
      const lock = await SeatLock.findById(booking.seatLockId).session(session);

      if (lock) {
        // Find the event and restore seats
        const event = await Event.findById(lock.eventId).session(session);

        if (event) {
          event.availableSeats += lock.seats;
          event.availableSeats = Math.min(
            event.availableSeats,
            event.totalSeats,
          );
          await event.save({ session });
        }

        // Mark lock as CANCELLED (for audit purposes)
        lock.status = "CANCELLED";
        await lock.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking: {
        id: booking._id,
        status: booking.status,
        event: booking.event,
        user: booking.user,
        seats: booking.seats,
      },
      originalAmount: originalAmount,
      refundAmount: refundAmount,
      cancellationFee: cancellationFee,
      correlationId: correlationId,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      success: false,
      message: "Booking cancellation failed",
      error: error.message,
      correlationId: correlationId,
    });
  }
};
