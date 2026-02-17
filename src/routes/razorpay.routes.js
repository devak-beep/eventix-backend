const express = require('express');
const router = express.Router();
const razorpayController = require('../controllers/razorpay.controller');

// Create Razorpay order
router.post('/create-order', razorpayController.createOrder);

// Verify payment
router.post('/verify-payment', razorpayController.verifyPayment);

// Handle payment failure
router.post('/payment-failed', razorpayController.paymentFailed);

module.exports = router;
