require('dotenv').config();
const express = require('express');
const router = express.Router();
const AuthController = require('../Controller/User/AuthController');

// **OTP Authentication Routes**
router.post('/send-otp', AuthController.sendOtp); // Send OTP to user
router.post('/verify-otp', AuthController.verifyOtp); // Verify OTP & Login

module.exports = router;
