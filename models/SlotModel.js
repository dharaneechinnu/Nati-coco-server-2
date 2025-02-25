const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
  date: { type: String, required: true }, // e.g., "2025-02-26"
  startTime: { type: String, required: true }, // e.g., "06:00 AM"
  endTime: { type: String, required: true }, // e.g., "08:00 AM"
  maxOrders: { type: Number, required: true }, // e.g., 10 orders per slot
  bookedOrders: { type: Number, default: 0 }, // Orders booked in this slot
  type: { type: String, enum: ["regular", "express"], default: "regular" }, // Slot type
});

module.exports = mongoose.model("Slot", slotSchema);
