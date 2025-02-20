const CityStore = require('../../models/CityOwnerModel');
const MenuModels = require('../../models/MenuModel');
const DeliveryPerson = require("../../models/DeliveryModels");
const PreOrder = require('../../models/PreOrderModel');
const Order = require('../../models/Ordermodels');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

// CityStore Login
const CityStoreLogin = async (req, res) => {
  try {
    const { mobileno, password } = req.body;

    // Validate input fields
    if (!mobileno || !password) {
      return res.status(400).json({ message: "Enter All fields" });
    }

    // Find user by phone number
    const user = await CityStore.findOne({ mobileno });
    if (!user) {
      return res.status(400).json({ message: "Phone Number Not Found" });
    }

    // Validate password
    const isValidate = await bcrypt.compare(password, user.password);
    if (isValidate) {
      // Generate access token
      const accessToken = jwt.sign(
        { mobileno: mobileno, userId: user._id },
        process.env.CITYOWNER_TOKEN,
        { expiresIn: '1d' }
      );

      // Respond with user data and token
      return res.status(200).json({
        message: "CityStore Login Successful",
        accessToken,
        user: {
          userId: user._id,
          name: user.name,
          mobileno: user.mobileno,
          email:user.email,
        }
      });
    } else {
      return res.status(401).json({ message: "Wrong Password!" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


// Multer Setup for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'ImageStore/'); 
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and JPG are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter });

const addMenuItem = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    const { storeId, category, subCategory, itemName, description, price, availability } = req.body;

    // Ensure an image is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    try {
      const menuItem = await MenuModels.create({
        storeId,
        category,
        subCategory,
        itemName,
        description,
        price,
        availability,
        image: `${req.file.filename}`, // Save image path
      });

      res.status(201).json({
        message: 'Menu item added successfully',
        menuItem,
      });
    } catch (error) {
      console.error('Error adding menu item:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

};

//store open or close
// controllers/storeController.js
const updateStoreAvailability = async (req, res) => {
  try {
    const { storeId, isOpen } = req.body;

    if (!storeId || isOpen === undefined) {
      return res.status(400).json({ success: false, message: 'Store ID and status are required' });
    }

    // Simulating a database update (replace with actual DB logic)
    const updatedStore = await CityStore.findByIdAndUpdate(
      storeId,
      { isOpen },
      { new: true }
    );

    if (!updatedStore) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Store availability updated successfully',
      store: updatedStore,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating store availability',
      error: error.message,
    });
  }
};

module.exports = {
  updateStoreAvailability,
};


// Update Menu Item by ID with Image Upload
const updateMenuItem = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    const { id } = req.params;
    const { category, subCategory, itemName, description, price, availability,newArrival,BestSeller,stock } = req.body;
    const image = req.file ? `/ImageStore/${req.file.filename}` : null;

    try {
      const updateData = {
        category,
        subCategory,
        itemName,
        description,
        price,
        availability,
        newArrival,
        BestSeller,
        stock,
      };

      if (image) updateData.image = image;

      const updatedMenuItem = await MenuModels.findByIdAndUpdate(id, updateData, { new: true });

      if (!updatedMenuItem) {
        return res.status(404).json({ message: 'Menu item not found' });
      }

      res.status(200).json({
        message: 'Menu item updated successfully',
        updatedMenuItem,
      });
    } catch (error) {
      console.error('Error updating menu item:', error);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });
};

// Delete Menu Item by ID
const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMenuItem = await MenuModels.findByIdAndDelete(id);

    if (!deletedMenuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Get Menu Items by Category, Subcategory, and Store ID
const getMenuItemsByCategory = async (req, res) => {
  const { subCategory, storeId } = req.query;

  try {
    const query = {};
    if (subCategory) query.subCategory = subCategory;
    if (storeId) query.storeId = storeId;

    const menuItems = await MenuModels.find(query);

    if (!menuItems || menuItems.length === 0) {
      return res.status(404).json({ message: 'No menu items found for the specified filters' });
    }

    res.status(200).json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// Get All Menu Items by Store ID
const getMenuItems = async (req, res) => {
  const { storeId } = req.query;

  try {
    const query = {};
    if (storeId) query.storeId = storeId;

    const menuItems = await MenuModels.find(query);

    if (!menuItems || menuItems.length === 0) {
      return res.status(404).json({ message: 'No menu items found for the specified store' });
    }

    res.status(200).json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// Get Delivery Persons
const getDeliveryPersons = async (req, res) => {
  try {
    const deliveryPersons = await DeliveryPerson.find();

    if (!deliveryPersons.length) {
      return res.status(404).json({ 
        message: 'No delivery persons found' 
      });
    }

    res.status(200).json({
      message: 'Delivery persons retrieved successfully',
      deliveryPersons
    });
  } catch (error) {
    console.error('Error retrieving delivery persons:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get Orders
const getOrders = async (req, res) => {
  try {
    const { storeId } = req.params; // Accessing storeId from req.params
    const orders = await Order.find({ storeId: storeId });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { orderId, status } = req.body; // Extract both orderId and status from the request body

    console.log("Order ID:", orderId);
    console.log("Status:", status);

    // Find and update the order by the custom `orderId` field
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },  // Match the `orderId` field in the database
      { status },   // Update the `status` field
      { new: true }  // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ message: "Order updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const PostPreOrder = async (req, res) => {
  try {
    const { userId, storeId, items, amount, paymentStatus, storeLocation, deliveryLocation, orderData, deliveryData } = req.body;
    console.log({ userId, storeId, items, amount, paymentStatus, storeLocation, deliveryLocation });

    if (!userId || !storeId || !items || items.length === 0 || !amount || !storeLocation || !deliveryLocation) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newPreOrder = new PreOrder({
      orderId,
      userId,
      storeId,
      items,
      amount,
      paymentStatus,
      storeLocation,
      deliveryLocation,
      orderData,
      deliveryData,
    });

    await newPreOrder.save();
    return res.status(201).json({ message: "Pre-order created successfully", data: newPreOrder });
  } catch (error) {
    console.error("Error in posting the preorder: ", error);
    return res.status(500).json({ message: "Error in posting preorder in DB" });
  }
};


module.exports = { 
  CityStoreLogin, 
  addMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  getMenuItems, 
  getDeliveryPersons, 
  getOrders,
  getMenuItemsByCategory,
  updateOrder,
  updateStoreAvailability,
  PostPreOrder
};
