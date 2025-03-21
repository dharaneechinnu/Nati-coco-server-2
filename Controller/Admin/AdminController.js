const Admin = require('../../models/AdminModel');
const CityAdmin = require('../../models/CityOwnerModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const CityOwnerModels = require('../../models/CityOwnerModel');
const multer = require('multer');
const path = require('path');
const MenuModels = require('../../models/MenuModel');

//Admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Enter all fields" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (admin.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Not an admin.' });
    }

    const isValidate = await bcrypt.compare(password, admin.password);
    if (isValidate) {
      const adminData = admin.toObject();
      delete adminData.password;

      const adminToken = jwt.sign(
        { role: admin.role },
        process.env.ADMIN_TOKEN,
        { expiresIn: '1h' }
      );

      res.status(200).json({
        message: 'Login successful',
        adminToken,
        admin: adminData
      });
    } else {
      res.status(400).json({ message: "Invalid password" });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// AddCityStoreAdmin Controller
//addMainAdmin - no citystore
const AddChickenStore = async (req, res) => {
  const { name, email, password, mobileno, locations, cityName } = req.body;
  try {
     // Validate location data
     if (!locations || !locations.latitude || !locations.longitude) {
      return res.status(400).json({ 
        message: 'Location data is required. Please provide both latitude and longitude.' 
      });
    }

    const existingAdmin = await CityAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Citystore Admin with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const CityownerAdmin = await CityAdmin.create({
      name,
      email,
      password: hashedPassword,
      role: 'cityOwner',
      cityName,
      mobileno,
      locations
    });
    
    // Send credentials via email
    const transporter = nodemailer.createTransport({  
      service: "gmail",
      auth: {
        user: "dharaneedharanchinnusamy@gmail.com",
        pass: process.env.PASS
      }
    });

    const mailOptions = {
      from: "dharaneedharanchinnusamy@gmail.com",
      to: email,
      subject: "Your City Store Admin Credentials",
      html: `
        <div style="color: black; font-size: 20px;">
          <p>Hello ${name},</p>
          <p>Your City Store Admin account has been created successfully.</p>
          <p><strong>Your login credentials:</strong></p>
          <p>Email: ${email}</p>
          <p>Password: ${password}</p>
          <p>Please change your password after first login for security purposes.</p>
          <p>Best regards,<br/>Admin Team</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending credentials email:', error);
        return res.status(500).json({ message: "Failed to send email" });
      } else {
        console.log('Credentials email sent:', info.response);
      }
    });

    res.status(201).json({ message: 'CityStore Admin registered successfully' });
  } catch (error) {
    console.error('Error during CityStore admin registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



// Get all City Owners without the password field
const getCityOwners = async (req, res) => {
  try {
    // Fetch all city owners and exclude the 'password' field
    const cityOwners = await CityOwnerModels.find().select('-password');

    if (!cityOwners.length) {
      return res.status(404).json({ message: 'No city owners found' });
    }

    res.status(200).json({
      message: 'City owners retrieved successfully',
      cityOwners,
    });
  } catch (error) {
    console.error('Error retrieving city owners:', error);
    res.status(500).json({ message: 'Internal server error' });
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

const addAdminMenuItem = async (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }

    const { Grams,Piece,category, subCategory, itemName, description, price, availability } = req.body;

    // Ensure an image is uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    try {
      const menuItem = await MenuModels.create({
        category,
        subCategory,
        itemName,
        description,
        price,
        availability,
        Grams,
        Piece,
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


const DeleteStoreById = async (req, res) => {
  const { storeId } = req.params; // The store ID will be passed as a parameter in the URL

  try {
    // Check if the store exists
    const store = await CityAdmin.findById(storeId); // Assuming you're using CityAdmin model for stores
    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Delete the store from the database
    await CityAdmin.findByIdAndDelete(storeId);

    res.status(200).json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error during store deletion:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

const renameStore = async (req, res) => {
  const { storeId } = req.params; // Store ID passed as a URL parameter
  const { newName } = req.body; // New store name from the request body

  // Validate new name
  if (!newName) {
    return res.status(400).json({ message: 'New store name is required' });
  }

  try {
    // Find the store by ID
    const store = await CityAdmin.findById(storeId); // Assuming you are using CityAdmin model for stores

    if (!store) {
      return res.status(404).json({ message: 'Store not found' });
    }

    // Update the store's name
    store.name = newName;

    // Save the updated store
    await store.save();

    res.status(200).json({ message: 'Store name updated successfully', store });
  } catch (error) {
    console.error('Error during store renaming:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

module.exports = {loginAdmin,AddChickenStore,getCityOwners,addAdminMenuItem,DeleteStoreById,renameStore};
