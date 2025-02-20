const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  mobileno: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
  },
  otpToken: {
    type: String,
  },
  otpExpire: {
    type: Date,
  },
  resetPwdToken: {
    type: String,
    default: null,
  },
  resetPwdExpire: {
    type: Date,
    default: null,
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
      default: Date.now, // Automatically records the last update time
    },
  },
  addresses: [
    {
      type: {
        type: String, // No enum constraint, allowing free text input
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
});

const userModel = mongoose.model('UsersLogins', userSchema);
module.exports = userModel;
