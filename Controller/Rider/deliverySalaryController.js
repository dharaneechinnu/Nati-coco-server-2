const Order = require('../../models/Ordermodels');
const DeliveryPersonSalary = require('../../models/DelSalaryModel');
/**
 * Calculate and update salary for a delivery person based on completed orders
 * Expects deliveryPersonId, month, and year in req.body
 */
const calculateSalary = async (req, res) => {
  try {
    const { deliveryPersonId, month, year } = req.body;
    console.log('Request body:', req.body);
    
    if (!deliveryPersonId || !month || !year) {
      console.log('Missing required parameters');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: deliveryPersonId, month, and year' 
      });
    }

    // Define date range for the given month/year
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    console.log('Start date:', startDate, 'End date:', endDate);

    // Find all completed orders for this delivery person in the specified month/year
    const completedOrders = await Order.find({
      deliveryPersonId: deliveryPersonId,
      status: 'COMPLETED',
      completedAt: { $gte: startDate, $lte: endDate }
    });
    console.log('Completed orders:', completedOrders);

    if (completedOrders.length === 0) {
      console.log('No completed orders found');
      return res.status(404).json({
        success: false,
        message: 'No completed orders found for this delivery person in the specified month'
      });
    }

    // Calculate salary components
    let totalDeliveries = 0;
    let totalDistance = 0;
    let totalDeliveryFee = 0;
    const completedOrderDetails = [];

    completedOrders.forEach(order => {
      totalDeliveries++;
      totalDistance += order.deliveryDistance;
      // Calculate delivery fee @ 10 rupees per km
      const deliveryFee = order.deliveryDistance * 10;
      totalDeliveryFee += deliveryFee;

      completedOrderDetails.push({
        orderId: order._id,
        deliveryDistance: order.deliveryDistance,
        deliveryFee: deliveryFee,
        completedAt: order.completedAt
      });
    });
    console.log('Total deliveries:', totalDeliveries, 'Total distance:', totalDistance, 'Total delivery fee:', totalDeliveryFee);

    // Find or create salary record for the given month/year
    let salaryRecord = await DeliveryPersonSalary.findOne({
      deliveryPersonId,
      month: parseInt(month),
      year: parseInt(year)
    });
    console.log('Salary record:', salaryRecord);

    if (salaryRecord) {
      // Update existing record
      salaryRecord.totalDeliveries = totalDeliveries;
      salaryRecord.totalDistance = totalDistance;
      salaryRecord.totalDeliveryFee = totalDeliveryFee;
      salaryRecord.completedOrders = completedOrderDetails;
      salaryRecord.updatedAt = new Date();
      await salaryRecord.save();
      console.log('Updated salary record:', salaryRecord);
    } else {
      // Create new record
      salaryRecord = await DeliveryPersonSalary.create({
        deliveryPersonId,
        month: parseInt(month),
        year: parseInt(year),
        totalDeliveries,
        totalDistance,
        totalDeliveryFee,
        completedOrders: completedOrderDetails
      });
      console.log('Created new salary record:', salaryRecord);
    }

    return res.status(200).json({
      success: true,
      data: {
        salaryRecord,
        orderDetails: completedOrderDetails.map(order => ({
          orderId: order.orderId,
          deliveryDistance: order.deliveryDistance.toFixed(2) + ' km',
          deliveryFee: '₹' + order.deliveryFee.toFixed(2),
          completedAt: order.completedAt
        }))
      }
    });
  } catch (error) {
    console.error('Error calculating delivery salary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate delivery salary',
      error: error.message
    });
  }
};

/**
 * Get salary details for a delivery person.
 * Accepts deliveryPersonId in req.body; month and year are optional.
 */
const getSalaryDetails = async (req, res) => {
  try {
    const { deliveryPersonId, month, year } = req.body;
    
    let query = { deliveryPersonId };
    
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }

    const salaryRecords = await DeliveryPersonSalary.find(query)
      .sort({ year: -1, month: -1 });

    if (!salaryRecords || salaryRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No salary records found for this delivery person'
      });
    }

    return res.status(200).json({
      success: true,
      count: salaryRecords.length,
      data: salaryRecords
    });
  } catch (error) {
    console.error('Error fetching salary details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch salary details',
      error: error.message
    });
  }
};

/**
 * Calculate distance-based fee for a single order.
 * Expects orderId in req.body.
 */
const calculateOrderFee = async (req, res) => {
  try {
    const { orderId } = req.body;
    // Fetch the order using the provided orderId
    const order = await Order.findOne({ orderId: orderId });
  
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Calculate delivery fee @ 10 rupees per km (Note: one function used 5 rupees; here we use 10)
    const deliveryFee = order.deliveryDistance * 10;

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.orderId,
        deliveryDistance: order.deliveryDistance.toFixed(2) + ' km',
        deliveryFee: '₹' + deliveryFee.toFixed(2),
        orderAmount: '₹' + order.amount,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Error calculating order fee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate order fee',
      error: error.message
    });
  }
};



const Razorpay = require("razorpay");

const razorpayInstance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
});

const withdrawSalaryRazorpay = async (req, res) => {
    try {
        const { deliveryPersonId, month, year, withdrawAmount, bankAccountId } = req.body;
        console.log('Withdrawal request (Razorpay) body:', req.body);

        if (!deliveryPersonId || !month || !year || !withdrawAmount || !bankAccountId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: deliveryPersonId, month, year, withdrawAmount, and bankAccountId'
            });
        }

        if (!razorpayInstance) {
            console.error("Razorpay instance is not initialized.");
            return res.status(500).json({
                success: false,
                message: "Razorpay is not configured properly."
            });
        }

        const salaryRecord = await DeliveryPersonSalary.findOne({
            deliveryPersonId,
            month: parseInt(month),
            year: parseInt(year)
        });

        if (!salaryRecord) {
            return res.status(404).json({
                success: false,
                message: 'Salary record not found for the specified month and year'
            });
        }

        const now = new Date();
        if (salaryRecord.lastWithdrawnAt) {
            const lastWithdrawDate = new Date(salaryRecord.lastWithdrawnAt);
            const oneWeekAgo = new Date(now);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            if (lastWithdrawDate > oneWeekAgo) {
                return res.status(400).json({
                    success: false,
                    message: 'Withdrawals are allowed only once per week',
                    lastWithdrawnAt: salaryRecord.lastWithdrawnAt
                });
            }
        }

        const availableAmount = salaryRecord.totalDeliveryFee - (salaryRecord.withdrawnAmount || 0);
        console.log('Available amount:', availableAmount);

        if (withdrawAmount > availableAmount) {
            return res.status(400).json({
                success: false,
                message: 'Requested withdrawal amount exceeds available funds',
                availableAmount: availableAmount
            });
        }

        const payoutOptions = {
            account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
            fund_account_id: bankAccountId,
            amount: withdrawAmount * 100,
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: `${deliveryPersonId}-${month}-${year}-${Date.now()}`,
            narration: "Delivery person withdrawal payout"
        };

        console.log('Razorpay payout options:', payoutOptions);

        const payoutResponse = await razorpayInstance.payouts.create(payoutOptions);
        console.log('Razorpay payout response:', payoutResponse);

        if (payoutResponse && payoutResponse.id) {
            salaryRecord.withdrawnAmount = (salaryRecord.withdrawnAmount || 0) + withdrawAmount;
            salaryRecord.lastWithdrawnAt = now;
            salaryRecord.totalDeliveryFee = 0;
            salaryRecord.updatedAt = new Date();
            await salaryRecord.save();

            return res.status(200).json({
                success: true,
                message: 'Withdrawal successful via Razorpay payout',
                data: {
                    salaryRecordId: salaryRecord._id,
                    withdrawnAmount: salaryRecord.withdrawnAmount,
                    remainingBalance: 0,
                    payoutId: payoutResponse.id,
                    payoutStatus: payoutResponse.status
                }
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Razorpay payout failed, please try again later'
            });
        }
    } catch (error) {
        console.error('Error processing Razorpay withdrawal:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process withdrawal via Razorpay',
            error: error.message
        });
    }
};

module.exports = {
  calculateSalary,
  getSalaryDetails,
  calculateOrderFee,
  withdrawSalaryRazorpay
};
