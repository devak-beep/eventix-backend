const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
require('express-async-errors');

const correlationMiddleware = require('./middlewares/correlation.middleware');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(correlationMiddleware);
app.use(express.json());

// Hard guarantee: every request waits for DB
app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    next();
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: 'Database not ready',
      error: err.message,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/health/db', (req, res) => {
  res.json({ success: true, readyState: mongoose.connection.readyState });
});

// Routes
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/locks', require('./routes/lock.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/jobs', require('./routes/job.routes'));
app.use('/api/audit', require('./routes/audit.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/cancellations', require('./routes/cancellation.routes'));

// Error handling
app.use(errorMiddleware);

module.exports = app;
