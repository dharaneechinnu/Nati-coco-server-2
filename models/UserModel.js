const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobileno: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    default: null, // Optional, user can add later
  },
  verified: {
    type: Boolean,
    default: false, // User is unverified until OTP is confirmed
  },
  otpToken: {
    type: String,
  },
  otpExpire: {
    type: Date,
  },
  liveLocation: {
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now, // Automatically updates when the location is updated
    },
  },
  addresses: [
    {
      type: {
        type: String, // Home, Work, etc.
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      landmark: {
        type: String,
        default: null, // Optional landmark field
      },
      timestamp: {
        type: Date,
        default: Date.now, // Records when the address was added
      },
    },
  ],
}, { timestamps: true });

const userModel = mongoose.model('Users', userSchema);
module.exports = userModel;
