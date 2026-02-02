const express = require("express");
const { expireLocks } = require("../jobs/lockExpiry.job");
const { expireBookings } = require("../jobs/bookingExpiry.job");
const { recoverFromFailures } = require("../jobs/failureRecovery.job");

const router = express.Router();

// Trigger lock expiry job
router.post("/expire-locks", async (req, res) => {
  try {
    await expireLocks();
    res.json({ success: true, message: "Lock expiry job completed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger booking expiry job
router.post("/expire-bookings", async (req, res) => {
  try {
    await expireBookings();
    res.json({ success: true, message: "Booking expiry job completed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trigger failure recovery job
router.post("/recover", async (req, res) => {
  try {
    await recoverFromFailures();
    res.json({ success: true, message: "Failure recovery job completed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
