const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require('../Controller/User/PaymentController');

router.post("/orders", createOrder);
router.post("/verify", verifyPayment);

module.exports = router;