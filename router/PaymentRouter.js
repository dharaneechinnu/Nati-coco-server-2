const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment, cancelAndRefundOrder } = require('../Controller/User/PaymentController');

router.post("/orders", createOrder);
router.post("/verify", verifyPayment);
router.post("/cancel/:orderId",cancelAndRefundOrder)


module.exports = router;