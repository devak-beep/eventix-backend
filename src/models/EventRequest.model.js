// ============================================
// EVENT REQUEST MODEL - Pending event creation requests
// ============================================
// Users submit requests, admins approve, then user pays to create event

const mongoose = require("mongoose");

const eventRequestSchema = new mongoose.Schema(
  {
    // FIELD: Event details (same as Event model)
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    eventDate: {
      type: Date,
      required: true,
    },

    totalSeats: {
      type: Number,
      required: true,
      min: [1, "Total seats must be at least 1"],
    },

    type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    category: [
      {
        type: String,
        enum: [
          "food-drink",
          "festivals-cultural",
          "dance-party",
          "sports-live",
          "arts-theater",
          "comedy-standup",
          "movies-premieres",
          "concerts-music",
        ],
      },
    ],

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    image: {
      type: String, // Base64 encoded image
    },

    // FIELD: Who submitted this request
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // FIELD: Request status
    status: {
      type: String,
      enum: [
        "PENDING", // Waiting for admin review
        "APPROVED", // Admin approved, waiting for payment
        "REJECTED", // Admin rejected
        "PAYMENT_PENDING", // User initiated payment
        "COMPLETED", // Payment done, event created
        "EXPIRED", // Payment window expired
      ],
      default: "PENDING",
    },

    // FIELD: Who approved/rejected this request
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reviewedAt: {
      type: Date,
    },

    // FIELD: Admin's note (reason for rejection, etc.)
    adminNote: {
      type: String,
    },

    // FIELD: Platform fee for event creation
    platformFee: {
      type: Number,
      default: 5000, // ₹5000 default
    },

    // FIELD: Payment details
    razorpayOrderId: {
      type: String,
    },

    razorpayPaymentId: {
      type: String,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },

    // FIELD: Payment expiry (after approval)
    paymentExpiresAt: {
      type: Date,
    },

    // FIELD: Reference to created event (after completion)
    createdEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },

    // FIELD: Idempotency key for duplicate prevention
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true, // Allow multiple nulls
    },
  },
  { timestamps: true },
);

// Index for efficient queries
eventRequestSchema.index({ status: 1, createdAt: -1 });
eventRequestSchema.index({ requestedBy: 1 });
// Note: idempotencyKey already has unique:true in field definition, no need for extra index

module.exports = mongoose.model("EventRequest", eventRequestSchema);
