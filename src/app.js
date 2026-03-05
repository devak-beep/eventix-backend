const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("express-async-errors");

const correlationMiddleware = require("./middlewares/correlation.middleware");
const errorMiddleware = require("./middlewares/error.middleware");

const userRoutes = require("./routes/user.routes");
const eventRoutes = require("./routes/event.routes");
const lockRoutes = require("./routes/lock.routes");
const bookingRoutes = require("./routes/booking.routes");

const app = express();

app.use(cors());
app.use(correlationMiddleware);
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Debug endpoint
app.get("/health/db", (req, res) => {
  res.json({
    success: true,
    readyState: mongoose.connection.readyState,
  });
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/locks", lockRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", require("./routes/payment.routes"));
app.use("/api/jobs", require("./routes/job.routes"));
app.use("/api/audit", require("./routes/audit.routes"));
app.use("/api/reports", require("./routes/reports.routes"));
app.use("/api/cancellations", require("./routes/cancellation.routes"));

// Error handling
app.use(errorMiddleware);

module.exports = app;
