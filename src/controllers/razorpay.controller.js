const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require("../models/Booking.model");
const SeatLock = require("../models/SeatLock.model");
const Event = require("../models/Event.model");
const mongoose = require("mongoose");

// Initialize Razorpay only if keys are provided
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Create Razorpay order
exports.createOrder = async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ 
      success: false, 
      message: "Payment gateway not configured" 
    });
  }

  const { bookingId } = req.body;

  try {
    const booking = await Booking.findById(bookingId).populate('event');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.status !== 'PAYMENT_PENDING') {
      return res.status(400).json({ success: false, message: "Booking not ready for payment" });
    }

    const amount = booking.event.ticketPrice * booking.seats.length * 100; // Convert to paise

    const options = {
      amount: amount,
      currency: "INR",
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId: bookingId.toString(),
        eventName: booking.event.name,
        seats: booking.seats.length
      }
    };

    const order = await razorpay.orders.create(options);

    // Store order ID in booking
    booking.razorpayOrderId = order.id;
    booking.amount = amount / 100; // Store in rupees
    await booking.save();

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

// Verify Razorpay payment
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  try {
    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // Payment verified, update booking
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findById(bookingId).session(session);

      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      // Update booking to CONFIRMED
      booking.status = 'CONFIRMED';
      booking.razorpayPaymentId = razorpay_payment_id;
      await booking.save({ session });

      // Mark seat lock as CONSUMED
      if (booking.seatLockId) {
        await SeatLock.findByIdAndUpdate(
          booking.seatLockId,
          { status: 'CONSUMED' },
          { session }
        );
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: "Payment verified and booking confirmed",
        booking: {
          id: booking._id,
          status: booking.status,
          amount: booking.amount
        }
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Handle payment failure
exports.paymentFailed = async (req, res) => {
  const { bookingId, error } = req.body;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const booking = await Booking.findById(bookingId).session(session);

    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Update booking to FAILED
    booking.status = 'FAILED';
    await booking.save({ session });

    // Restore seats
    if (booking.seatLockId) {
      const lock = await SeatLock.findById(booking.seatLockId).session(session);
      if (lock) {
        await Event.findByIdAndUpdate(
          lock.eventId,
          { $inc: { availableSeats: lock.seats } },
          { session }
        );
        lock.status = 'EXPIRED';
        await lock.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Payment failed, seats restored"
    });
  } catch (err) {
    console.error('Payment failure handling error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to handle payment failure',
      error: err.message
    });
  }
};
