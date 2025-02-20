const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UsersLogins",
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "citystore",
      required: true,
    },
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        itemName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    amount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending",
      required: true,
    },
    deliveryPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPerson", // Reference to the DeliveryPerson model
    },
    status: {
      type: String,
      enum: ["PENDING", "PREPARING", "READY", "COMPLETED","OUT_FOR_DELIVERY","REJECTED"],
      required: true,
      default: "PENDING",
    },
    // Location for store
    storeLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    // Location for delivery
    deliveryLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    // Calculated delivery distance (in kilometers)
    deliveryDistance: {
      type: Number,
      default: null,
    },
    // New fields for OTP verification
    deliveryOTP: {
      type: String,
      default: null,
    },
    userOTP:{
      type:Number,
      default:null
    },
    otpGeneratedAt: {
      type: Date,
      default: null,
    },
    // Timestamps for status updates
    completedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    preparingStartedAt: {
      type: Date,
      default: null,
    },
    readyAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const OrderModel = mongoose.model("Order", OrderSchema);
module.exports = OrderModel;
