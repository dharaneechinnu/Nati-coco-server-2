const mongoose = require("mongoose");

const DeliveryPersonSchema = new mongoose.Schema(
  {
    deliverypersonId: {
      type: String,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    phonenumber: {
      type: String,
    },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    availability: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpToken: {
      type: String,
      default: null,
    },
    otpExpire: {
      type: Date,
    },
    rcDocument:[String],

    aadharcard: {
      type: String, // Changed to String to accommodate Aadhar card number with optional leading zeros
    },
    pancard: {
      type: String, // Kept String as PAN card typically contains alphanumeric characters
    },
    driving: {
      type: String, // Kept String as it is likely to hold file paths or IDs
    },
   
  },
  { timestamps: true } // Added missing comma before this line
);

const DeliveryPersonModel = mongoose.model("DeliveryPerson", DeliveryPersonSchema);
module.exports = DeliveryPersonModel;
