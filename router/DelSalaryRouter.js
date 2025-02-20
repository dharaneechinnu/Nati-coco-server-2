const express = require('express');
const router = express.Router();
const deliverySalaryController = require('../Controller/Rider/deliverySalaryController');

// Calculate and update salary for a delivery person
router.post('/calculate', deliverySalaryController.calculateSalary);

// Get salary details for a delivery person (with optional month/year filter)
router.post('/details', deliverySalaryController.getSalaryDetails);

// Calculate fee for a single order
router.post('/order-fee', deliverySalaryController.calculateOrderFee);

module.exports = router;