const userLocation = require('../../models/UserModel');
const Order = require('../../models/Ordermodels');
const DeliveryPerson = require('../../models/DeliveryModels');

const PostUserLiveLocation = async (req, res) => {
    try {
      const { userId, latitude, longitude } = req.body;
  
      if (!userId || !latitude || !longitude) {
        return res.status(400).json({ message: 'All fields are required: userId, latitude, and longitude.' });
      }
  
      const user = await userLocation.findByIdAndUpdate(
        userId,
        { 
          liveLocation: { latitude, longitude, timestamp: new Date() } 
        },
        { new: true }
      );
  
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      res.status(200).json({ message: 'Live location updated successfully.', liveLocation: user.liveLocation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error updating live location.', error });
    }
  };


const GetLiveLocation = async(req,res) =>{
  try {
    const{userId} =req.params;
    const user = await userLocation.findById(userId);
    if(!user){
      res.status(400).json({message:"Use Live location Not Found"});
    }
    res.status(200).json({livelocations:user.liveLocation});
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching live location.', error });
  }
}


const postUserAddress = async (req, res) => {
    try {
      const { userId, type, address, latitude, longitude, landmark } = req.body;
  
      if (!userId || !type || !address || !latitude || !longitude) {
        return res.status(400).json({ message: 'All fields are required: userId, type, address, latitude, and longitude.' });
      }

      const user = await userLocation.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      user.addresses.push({
        type,
        address,
        latitude,
        longitude,
        landmark: landmark || null,
      
      });

      await user.save();
  
      res.status(201).json({ message: 'Address added successfully.', addresses: user.addresses });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error adding address.', error });
    }
  };

const getUserAddresses = async (req, res) => {
    try {
      const { userId } = req.params;
  
      if (!userId) {
        return res.status(400).json({ message: 'UserId is required.' });
      }
  
      const user = await userLocation.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      res.status(200).json({ addresses: user.addresses });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching addresses.', error });
    }
  };
  


// Helper function to calculate distance (in kilometers)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degree) => (degree * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in kilometers
};

// Get Delivery Person's Order History
const getOrderHistory = async (req, res) => {
    const { id } = req.params; // Delivery Person ID

    try {
        // Fetch completed orders for the delivery person
        const orders = await Order.find({ 
          deliveryPersonId: id, 
          status: 'COMPLETED' 
        });

        if (!orders) {
            return res.status(404).json({ message: "No completed orders found." });
        }

        // Iterate over orders, calculate and store delivery distances
        const updatedOrders = await Promise.all(
            orders.map(async (order) => {
                const { storeLocation, deliveryLocation } = order;

                // Check if distance already exists
                if (!order.deliveryDistance) {
                    const distance = calculateDistance(
                        storeLocation.lat, storeLocation.lon,
                        deliveryLocation.lat, deliveryLocation.lon
                    );

                    // Update the order with the calculated distance
                    order.deliveryDistance = distance.toFixed(2); // Round to 2 decimal places
                    await order.save();
                }

                return order;
            })
        );

        res.status(200).json({ orders: updatedOrders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error", error });
    }
};
  
module.exports = {PostUserLiveLocation,postUserAddress,GetLiveLocation,getUserAddresses,getOrderHistory};