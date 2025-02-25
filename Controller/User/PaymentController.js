const Razorpay = require("razorpay");
const crypto = require("crypto");
const PaymentSchema = require("../../models/PaymentModels");
const Order = require("../../models/Ordermodels"); // Adjust the path as needed

// Constant for cancellation window (10 minutes in milliseconds)
const TEN_MINUTES = 10 * 60 * 1000;

// Create a Razorpay instance configuration function to reuse in our controllers
const getRazorpayInstance = () =>
  new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET,
  });

const createOrder = async (req, res) => {
  try {
    const instance = getRazorpayInstance();

    const options = {
      amount: req.body.amount,
      currency: "INR",
      receipt: crypto.randomBytes(10).toString("hex"),
    };

    instance.orders.create(options, (error, order) => {
      if (error) {
        console.error("Error creating order:", error);
        return res.status(500).json({ message: "Something went wrong!" });
      }
      console.log("order", order);
      res.status(200).json({ data: order });
    });
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const result = await PaymentSchema.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        status: true,
      });
      console.log("result : ", result);
      return res
        .status(200)
        .json({ message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ message: "Invalid signature sent!" });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};


const cancelAndRefundOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    // Assuming req.user is set by an authentication middleware
    const userId = req.user._id;

    // Find the order and ensure it belongs to the current user
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }

    // Check if order is already cancelled or refunded
    if (["Cancelled", "Refunded"].includes(order.status)) {
      return res
        .status(400)
        .json({ error: "Order is already cancelled or refunded." });
    }

    // Ensure the order was placed within the last 10 minutes
    const now = new Date();
    if (now - order.createdAt > TEN_MINUTES) {
      return res.status(400).json({
        error:
          "Cancellation window expired. Orders can only be cancelled within 10 minutes of placement.",
      });
    }

    // Initiate refund through Razorpay
    const instance = getRazorpayInstance();

    // Multiply amount by 100 if Razorpay uses subunits (paise for INR)
    const refundAmount = order.amount * 100;

    // Initiate refund; check your Razorpay SDK version for proper usage.
    const refundResponse = await instance.payments.refund(
      order.razorpayPaymentId,
      { amount: refundAmount }
    );

    // Update order status and store refund details if needed
    order.status = "Refunded";
    await order.save();

    return res.status(200).json({
      message: "Order cancelled and refund processed successfully.",
      refund: refundResponse,
    });
  } catch (error) {
    console.error("Error in cancelAndRefundOrder:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  cancelAndRefundOrder,
};
