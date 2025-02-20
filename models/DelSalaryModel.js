const mongoose = require('mongoose');

const deliveryPersonSalarySchema = new mongoose.Schema({
  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryPerson',
    required: true
  },
  totalDeliveries: {
    type: Number,
    default: 0
  },
  totalDistance: {
    type: Number,
    default: 0
  },
  totalDeliveryFee: {
    type: Number,
    default: 0
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  completedOrders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    deliveryDistance: Number,
    deliveryFee: Number,
    completedAt: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryPersonSalary', deliveryPersonSalarySchema);