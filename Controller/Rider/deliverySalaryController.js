const Order = require('../../models/Ordermodels');
const DeliveryPersonSalary = require('../../models/DelSalaryModel');
const mongoose = require('mongoose');

const deliverySalaryController = {
  /**
   * Calculate and update salary for a delivery person based on completed orders
   * @param {Object} req - Request object with deliveryPersonId, month, and year
   * @param {Object} res - Response object
   */
  calculateSalary: async (req, res) => {
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

      // Find all completed orders for this delivery person in the given month/year
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      console.log('Start date:', startDate, 'End date:', endDate);

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

      // Find or create salary record for this month
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
  },

  /**
   * Get salary details for a delivery person
   * @param {Object} req - Request object with deliveryPersonId
   * @param {Object} res - Response object
   */
  getSalaryDetails: async (req, res) => {
    try {
      const { deliveryPersonId } = req.body;
      const { month, year } = req.body;
      
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
  },

  /**
   * Calculate distance-based fee for a single order
   * @param {Object} req - Request object with orderId
   * @param {Object} res - Response object
   */

  calculateOrderFee: async (req, res) => {
    try {
      const { orderId } = req.body;
      // Fetch the order using the orderId field
      const order = await Order.findOne({ orderId: orderId });
    
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Calculate delivery fee @ 10 rupees per km
      const deliveryFee = order.deliveryDistance * 5;

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
  }
};

module.exports = deliverySalaryController;