const Order = require("../../models/Ordermodels");
const Store = require('../../models/CityOwnerModel');
const DeliveryPerson = require('../../models/DeliveryModels');
const MenuModels = require('../../models/MenuModel');
const geolib = require('geolib'); // Added missing geolib import
const mongoose = require("mongoose");
const crypto = require('crypto');
const PreOrder = require('../../models/PreOrderModel');

const generateUniqueOrderId = async () => {
  const maxAttempts = 10;
  let orderId;
  let isUnique = false;
  let attempts = 0;

  do {
    const randomNum = Math.floor(Math.random() * 90000) + 10000; 
    orderId = `ORD#${randomNum}`;

    const existingOrder = await Order.findOne({ orderId });
    if (!existingOrder) {
      isUnique = true;
    }

    attempts++;
  } while (!isUnique && attempts < maxAttempts);

  if (!isUnique) {
    throw new Error("Unable to generate a unique orderId after multiple attempts.");
  }

  return orderId;
};

// Create order endpoint
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      storeId,
      items,
      amount,
      paymentStatus,
      storeLocation,
      deliveryLocation,
    } = req.body;

    console.log("Incoming Order Data:", req.body);

    // Validate required fields
    if (!userId || !storeId || !items || !amount || !paymentStatus) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Validate `userId` and `storeId` as valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "Invalid userId or storeId format." });
    }

    // Generate unique order ID
    const orderId = await generateUniqueOrderId();

    // Calculate delivery distance
    const deliveryDistance = calculateDistance(storeLocation, deliveryLocation);

    // Create a new order in the database
    const newOrder = await Order.create({
      userId,
      storeId,
      items,
      amount,
      orderId,
      paymentStatus,
      storeLocation,
      deliveryLocation,
      deliveryDistance,
    });

    res.status(201).json({
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};


// Helper function to calculate distance (Haversine formula)
const calculateDistance = (start, end) => {
  const toRadians = (degree) => (degree * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(end.latitude - start.latitude);
  const dLon = toRadians(end.longitude - start.longitude);

  const lat1 = toRadians(start.latitude);
  const lat2 = toRadians(end.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};



const getOrderAnalytics = async (req, res) => {
    try {
        const { timeFilter = 'WEEK' } = req.query;
        const now = new Date();
        const filterDate = new Date();

        switch (timeFilter) {
            case 'WEEK':
                filterDate.setDate(now.getDate() - 7);
                break;
            case 'MONTH':
                filterDate.setMonth(now.getMonth() - 1);
                break;
            case 'YEAR':
                filterDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                filterDate.setDate(now.getDate() - 7);
        }

        // Get filtered orders
        const orders = await Order.find({
            createdAt: { $gte: filterDate }
        }).populate('storeId', 'name');

        // Calculate total stats
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate daily data
        const dailyData = {};
        orders.forEach(order => {
            const date = order.createdAt.toLocaleDateString();
            if (!dailyData[date]) {
                dailyData[date] = {
                    revenue: 0,
                    orders: 0,
                    avgOrderValue: 0
                };
            }
            dailyData[date].revenue += order.total;
            dailyData[date].orders += 1;
        });

        // Calculate store performance
        const storeStats = {};
        orders.forEach(order => {
            if (!storeStats[order.storeId._id]) {
                storeStats[order.storeId._id] = {
                    id: order.storeId._id,
                    name: order.storeId.name,
                    orders: 0,
                    revenue: 0,
                    ratings: []
                };
            }
            storeStats[order.storeId._id].orders += 1;
            storeStats[order.storeId._id].revenue += order.total;
            if (order.rating) {
                storeStats[order.storeId._id].ratings.push(order.rating);
            }
        });

        // Process store stats
        const topStores = Object.values(storeStats)
            .map(store => ({
                ...store,
                rating: store.ratings.length > 0 
                    ? store.ratings.reduce((a, b) => a + b) / store.ratings.length 
                    : 0
            }))
            .sort((a, b) => b.orders - a.orders);

        // Calculate percentage changes (mock data for now)
        const percentageChanges = {
            orders: 12.5,
            revenue: 8.3,
            avgOrderValue: -2.1
        };

        res.status(200).json({
            totalStats: {
                orders: 200,
                revenue: totalRevenue,
                avgOrderValue,
                percentageChanges
            },
            dailyData: Object.values(dailyData),
            topStores: topStores.slice(0, 5)
        });
    } catch (error) {
        console.error('Error in getOrderAnalytics:', error);
        res.status(500).json({ message: "Error fetching order analytics", error: error.message });
    }
};

const findNearestStoreAndDisplayMenu = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const userLocation = { latitude: lat, longitude: lon };
    const allStores = await Store.find();
    if (!allStores || !allStores.length) {
      return res.status(404).json({ message: 'No stores found' });
    }

    const validStores = allStores.filter(store => 
      store.locations?.latitude !== undefined && 
      store.locations?.longitude !== undefined
    );

    if (!validStores.length) {
      return res.status(404).json({ message: 'No valid stores found' });
    }

    const storesWithinRange = validStores.filter(store => {
      const storeLocation = { 
        latitude: store.locations.latitude, 
        longitude: store.locations.longitude 
      };
      const distanceToUser = geolib.getDistance(userLocation, storeLocation);
        //Change based on needs from client
      return distanceToUser <= 10000; 
    });

    if (!storesWithinRange.length) {
      return res.status(404).json({ message: 'No nearby stores within 10 km found' });
    }

    
    const nearestStore = storesWithinRange.reduce((closest, store) => {
      const storeLocation = { 
        latitude: store.locations.latitude, 
        longitude: store.locations.longitude 
      };
      const distanceToUser = geolib.getDistance(userLocation, storeLocation);

      if (!closest || distanceToUser < closest.distance) {
        return { id: store._id, distance: distanceToUser };
      }
      return closest;
    }, null);

    if (!nearestStore) {
      return res.status(404).json({ message: 'Unable to find a nearest store' });
    }

    console.log(nearestStore.id);

    const storeMenu = await MenuModels.find({
      storeId: nearestStore.id,
      availability: true
    });


    const storlocation = await Store.findById(nearestStore.id);

    if (!storeMenu.length) {
      return res.status(404).json({ message: 'No menu items available at the nearest store' });
    }

    res.json({
      message: `Nearest store menu retrieved successfully`,
      nearestStoreId: nearestStore.id,
      menu: storeMenu.map(item => ({
        ...item._doc,
        image: `http://${req.headers.host}/ImageStore/${item.image}`, // Ensure correct path
      })),
      StoreLocations:storlocation
    });
    
    
  } catch (error) {
    console.error("Error finding nearest store and its menu:", error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request', 
      details: error.message 
    });
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
};

const markOrderReadyAndAssignDelivery = async (req, res) => {
  try {
    const { orderId, storeId } = req.body;

    // Validate inputs
    if (!orderId || !storeId) {
      return res.status(400).json({ error: 'Order ID and Store ID are required' });
    }

    // Fetch store details
    const store = await Store.findById(storeId);
    if (!store || !store.locations || !store.locations.latitude || !store.locations.longitude) {
      return res.status(404).json({ message: 'Store not found or has invalid location' });
    }

    const storeLocation = {
      latitude: store.locations.latitude,
      longitude: store.locations.longitude,
    };

    // Fetch all available delivery persons
    const availableDeliveryPersons = await DeliveryPerson.find({ availability: true });
    if (!availableDeliveryPersons.length) {
      return res.status(404).json({ message: 'No available delivery persons found' });
    }

    // Calculate distances to store and filter within range (20 km)
    const maxDistance = 20000; // 20 km in meters
    const deliveryPersonsInRange = availableDeliveryPersons
      .map(person => {
        if (!person.location || !person.location.latitude || !person.location.longitude) {
          return null;  // Skip persons without a location
        }

        const deliveryPersonLocation = {
          latitude: person.location.latitude,
          longitude: person.location.longitude,
        };

        const distanceToStore = geolib.getDistance(storeLocation, deliveryPersonLocation);
        return distanceToStore <= maxDistance
          ? { person, distance: distanceToStore }
          : null;
      })
      .filter(Boolean);  // Filter out null values

    if (!deliveryPersonsInRange.length) {
      return res.status(404).json({ message: 'No delivery persons available within range' });
    }

    // Find the nearest delivery person
    const nearestDeliveryPerson = deliveryPersonsInRange.reduce((closest, current) =>
      !closest || current.distance < closest.distance ? current : closest, null
    );

    if (!nearestDeliveryPerson) {
      return res.status(404).json({ message: 'Unable to assign a delivery person' });
    }

    console.log('Nearest delivery person:', nearestDeliveryPerson.person.name);

    // Mark the order as ready and assign the delivery person
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Generate and save the OTP for the order
    const otp = generateOTP();
    order.deliveryOTP = otp;  // Save the generated OTP in the order document
    order.status = 'READY';
    order.deliveryPersonId = nearestDeliveryPerson.person._id; // Assigning ObjectId correctly
    order.otpGeneratedAt = new Date(); 
    await order.save();
    console.log('Order updated:', order);
    

    // Update the delivery person's availability to false (no longer available)
    nearestDeliveryPerson.person.availability = false;
    await nearestDeliveryPerson.person.save();
    console.log('Updated delivery person availability:', nearestDeliveryPerson.person.name);

    // Respond with success and delivery details, including OTP
    res.status(200).json({
      message: 'Order marked as ready and delivery person assigned',
      orderId: order._id,
      deliveryPerson: {
        id: nearestDeliveryPerson.person._id,
        name: nearestDeliveryPerson.person.name,
        distance: `${(nearestDeliveryPerson.distance / 1000).toFixed(2)} km`,  // Distance in km
      },
      OTP: order.deliveryOTP,  // Include OTP in the response
    });
  } catch (error) {
    console.error('Error marking order ready and assigning delivery:', error);
    res.status(500).json({
      error: 'An error occurred while processing your request',
      details: error.message,
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID format" });
    }

    // Fetch orders from DB
    const orders = await Order.find({ userId })
      .populate("storeId", "name locations") // Fetch store details
      .sort({ createdAt: -1 }); // Sort by latest order first

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: "No orders found for this user" });
    }

    // Format orders for better response
    const formattedOrders = orders.map((order) => ({
      orderId: order.orderId,
      status: order.status,
      totalAmount: order.amount,
      paymentStatus: order.paymentStatus,
      orderDate: order.createdAt.toLocaleString(),
      store: {
        name: order.storeId?.name || "Unknown Store",
        location: order.storeId?.locations || "Not Available",
      },
      items: order.items.map((item) => ({
        name: item.itemName || "Unknown Item",
        price: item.price || 0,
        quantity: item.quantity,
      })),
      deliveryOTP: order.deliveryOTP,
      timestamps: {
        preparingStartedAt: order.preparingStartedAt,
        readyAt: order.readyAt,
        completedAt: order.completedAt,
        rejectedAt: order.rejectedAt,
        rejectionReason: order.rejectionReason,
      },
    }));

    res.status(200).json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ success: false, message: "Error fetching orders", error: error.message });
  }
};

const verifyAndComplete = async (req, res) => {
  try {
    const { orderId, otp } = req.body;

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify OTP
    if (order.deliveryOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Check if OTP is expired (optional: OTP valid for 1 hour)
    const otpAge = (new Date() - new Date(order.otpGeneratedAt)) / 1000 / 60 / 60; // hours
    if (otpAge > 1) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    // Update order status
    order.status = 'OUT_FOR_DELIVERY';
    order.completedAt = new Date();
    await order.save();

    res.json({ success: true, message: 'Order completed successfully' });
  } catch (error) {
    console.error('Error verifying and completing order:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getOrderByOrderId = async (req, res) => {
  try {
      const { orderId } = req.body;

      // Check if the orderId is provided
      if (!orderId) {
          return res.status(400).json({ message: "Order ID is required" });
      }

      // Fetch the order details from the Order model, populating the delivery person details
      const order = await Order.findOne({ orderId }).populate('deliveryPersonId');

      // If the order doesn't exist, return a 404 error
      if (!order) {
          return res.status(404).json({ message: "Order not found" });
      }

      // If deliveryPersonId is populated, return both order and delivery person details
      if (order.deliveryPersonId) {
          const deliveryPerson = order.deliveryPersonId;

          return res.status(200).json({
              message: "Order and delivery person details fetched successfully",
              order: {
                  orderId: order.orderId,
                  userId: order.userId,
                  storeId: order.storeId,
                  items: order.items,
                  amount: order.amount,
                  paymentStatus: order.paymentStatus,
                  status: order.status,
                  storeLocation: order.storeLocation,
                  deliveryLocation: order.deliveryLocation,
                  deliveryDistance: order.deliveryDistance,
                  deliveryOTP: order.deliveryOTP,
                  completedAt: order.completedAt,
                  rejectedAt: order.rejectedAt,
                  rejectionReason: order.rejectionReason,
                  preparingStartedAt: order.preparingStartedAt,
                  readyAt: order.readyAt,
              },
              deliveryPerson: {
                  id: deliveryPerson._id,
                  name: deliveryPerson.name,
                  email: deliveryPerson.email,
                  phoneNumber: deliveryPerson.phoneNumber,
                  isVerified: deliveryPerson.isVerified,
                  availability: deliveryPerson.availability,
              }
          });
      }

      // If deliveryPersonId is not found, return only order details
      return res.status(200).json({
          message: "Order details fetched successfully (without delivery person)",
          order: {
              orderId: order.orderId,
              userId: order.userId,
              storeId: order.storeId,
              items: order.items,
              amount: order.amount,
              paymentStatus: order.paymentStatus,
              status: order.status,
              storeLocation: order.storeLocation,
              deliveryLocation: order.deliveryLocation,
              deliveryDistance: order.deliveryDistance,
              deliveryOTP: order.deliveryOTP,
              completedAt: order.completedAt,
              rejectedAt: order.rejectedAt,
              rejectionReason: order.rejectionReason,
              preparingStartedAt: order.preparingStartedAt,
              readyAt: order.readyAt,
          }
      });

  } catch (error) {
      console.error("Error fetching order and delivery person:", error);
      return res.status(500).json({ message: "Internal server error", error });
  }
};


const getHelpOrderStoreDetails = async(req,res) =>{
  try {
      const {id} = req.body;

      if(!id){
       return res.status(400).json({message:"Id of the store is required"});
      }

        const StoreDetails = await Store.findById(id);
        console.log(StoreDetails);

      if(!StoreDetails){
        return res.status(400).json({message:"StoreDetails Not found "});
      }

      return res.status(200).json({StoreDetails:StoreDetails});

  } catch (error) {
    console.log("Error in Fetching the Store Details : ",error);
    return res.status(500).json({message:"Error in Fetching the Store Details"});
  }
}

const GeneratedUserOTP = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Validate orderId
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Find the order by orderId
    const order = await Order.findOne({orderId:orderId});

    // Check if order exists
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Generate a 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Update the order with the generated OTP
    order.userOTP = otp;
    await order.save();

    console.log("OTP generated and stored successfully");

    return res.status(200).json({ message: "OTP generated successfully", otp });
  } catch (error) {
    console.error("Error in generating OTP: ", error);
    return res.status(500).json({ message: "Error in generating OTP", error });
  }
};




const GetUserOTP = async (req, res) => {
  try {
    const { orderId } = req.body;

    // Validate orderId
    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    // Assuming Order is your Mongoose model
    const order = await Order.findOne({ orderId: orderId }).select("userOTP");

    // Check if order exists
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ message: "OTP retrieved successfully", otp: order.userOTP });
  } catch (error) {
    console.error("Error in getting OTP: ", error);
    return res.status(500).json({ message: "Error in getting OTP", error });
  }
};


const PostPreOrder = async (req, res) => {
  try {
    const { userId, storeId, items, amount, paymentStatus, storeLocation, deliveryLocation } = req.body;

    // Simple validation for required fields
    if (!userId || !storeId || !items || !amount || !paymentStatus || !storeLocation || !deliveryLocation) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Generate a unique order ID (you can use a package like `uuid` or implement your own logic)
    const orderId = `PO-${new Date().getTime()}`;

    // Create a new preorder instance
    const newPreOrder = new PreOrder({
      orderId,
      userId,
      storeId,
      items,
      amount,
      paymentStatus,
      storeLocation,
      deliveryLocation,
      status: 'PENDING', // Initial status
    });

    // Save the preorder to the database
    const savedPreOrder = await newPreOrder.save();

    // Respond with the created preorder
    return res.status(201).json({ message: 'Preorder created successfully', order: savedPreOrder });

  } catch (error) {
    console.log("Post Error: ", error);
    return res.status(500).json({ message: "Post error", error });
  }
};


const GetOrderByStoreId = async (req, res) => {
  try {
    const { storeId } = req.params;

    // Validate if storeId is provided
    if (!storeId) {
      return res.status(400).json({ message: 'Store ID is required' });
    }

    // Query to get orders based on storeId
    const orders = await PreOrder.find({ storeId });

    if (orders.length === 0) {
      return res.status(404).json({ message: 'No orders found for this store' });
    }


    return res.status(200).json({ orders });

  } catch (error) {
    console.log("Get Error: ", error);
    return res.status(500).json({ message: "Get error", error });
  }
};


module.exports = {
    createOrder,
    findNearestStoreAndDisplayMenu,
    getOrderAnalytics,
    markOrderReadyAndAssignDelivery,
    verifyAndComplete,
    getMyOrders,
    getOrderByOrderId,
    getHelpOrderStoreDetails,
    GeneratedUserOTP,
    GetUserOTP,
    PostPreOrder,
    GetOrderByStoreId
};
