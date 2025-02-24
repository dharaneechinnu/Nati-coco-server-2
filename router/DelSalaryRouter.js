const express = require('express');
const router = express.Router();
const {calculateSalary,getSalaryDetails,calculateOrderFee,withdrawSalaryRazorpay} = require('../Controller/Rider/deliverySalaryController');

// Calculate and update salary for a delivery person
router.post('/calculate', calculateSalary);

// Get salary details for a delivery person (with optional month/year filter)
router.post('/details', getSalaryDetails);

// Calculate fee for a single order
router.post('/order-fee', calculateOrderFee);

router.post('/Withdrawl-del',withdrawSalaryRazorpay)

module.exports = router;