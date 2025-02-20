const mongoose = require('mongoose');

const PreOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
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
  orderDate: {
    type: Date,
    default: Date.now,
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
    ref: "DeliveryPerson",
    default: null,
  },
  status: {
    type: String,
    enum: ["PENDING", "PREPARING", "READY", "COMPLETED", "REJECTED"],
    required: true,
    default: "PENDING",
  },
  storeLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  deliveryLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  deliveryDistance: {
    type: Number,
    default: null,
  },
  deliveryOTP: {
    type: String,
    default: null,
  },
  otpGeneratedAt: {
    type: Date,
    default: null,
  },
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
  orderData: {
    type: Object,
    default: {},
  },
  deliveryData: {
    type: Object,
    default: {},
  },
});

const PreOrder = mongoose.model('PreOrder', PreOrderSchema);
module.exports = PreOrder;