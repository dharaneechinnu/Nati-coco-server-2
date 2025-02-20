require('dotenv').config();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { parsePhoneNumber } = require('libphonenumber-js');
const deliveryPersonModel = require('../../models/DeliveryModels');
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);
const senderID = process.env.TWILIO_SENDER_ID;

// Login delivery person
const DeliverypersonLogin = async (req, res) => {
    try {
        const riderlogin = { phonenumber, password } = req.body;
console.log(riderlogin)
        if (!phonenumber || !password) {
            return res.status(400).json({ message: 'Enter all fields' });
        }

        const user = await deliveryPersonModel.findOne({ phonenumber });
        if (!user) {
            return res.status(404).json({ message: 'Delivery person not found' });
        }

        const isValidate = await bcrypt.compare(password, user.password);
        if (isValidate) {
            const { password, ...userWithoutPassword } = user.toObject();

            const accessToken = jwt.sign(
                { phonenumber: phonenumber, userId: user._id },
                process.env.DELIVERY_TOKEN,
                { expiresIn: '1d' }
            );

            res.status(200).json({
                accessToken,
                user: userWithoutPassword
            });
        } else {
            res.status(400).json({ message: 'Invalid password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const DeliverypersonRegister = async (req, res) => {
    try {
        const { name, email, password, phonenumber } = req.body;

        // Check if all fields are provided
        if (!name || !email || !password || !phonenumber) {
            return res.status(400).json({ message: 'Enter all the fields' });
        }

        // Check if delivery person already exists with the given phone number
        const userExists = await deliveryPersonModel.findOne({ phonenumber });
        if (userExists) {
            return res.status(400).json({ message: 'Delivery person already exists' });
        }

        // Generate the deliverypersonId by getting the total count of delivery persons
        const totalDeliveryPersons = await deliveryPersonModel.countDocuments(); // Get the total number of delivery persons
        const newId = `#DEL${(totalDeliveryPersons + 1).toString().padStart(3, '0')}`; // Format ID as DEL001, DEL002, etc.

        // Hash the password
        const hashpwd = await bcrypt.hash(password, 10);

        // Create a new delivery person entry in the database with the generated deliverypersonId
        const newDeliveryPerson = new deliveryPersonModel({
            name,
            email,
            password: hashpwd,
            phonenumber,
            deliverypersonId: newId // Pass the generated deliverypersonId here
        });

        // Save the new delivery person to the database
        await newDeliveryPerson.save();

        // Respond with a success message and the generated ID
        res.status(200).json({ message: 'Delivery person registered successfully', deliverypersonId: newId });
    } catch (error) {
        console.error('Error registering delivery person:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


// Send OTP for verification
const sendOtp = async (req, res) => {
  try {
      const { phonenumber } = req.body;

      // Check if phone number is provided
      if (!phonenumber) {
          return res.status(400).json({ message: 'Phone number is required' });
      }

      let parsedPhoneNumber;
      try {
          parsedPhoneNumber = parsePhoneNumber(phonenumber);
      } catch (error) {
          console.error('Phone number parsing error:', error);
          return res.status(400).json({ message: 'Invalid phone number format' });
      }

      // Validate phone number format
      if (!parsedPhoneNumber.isValid()) {
          return res.status(400).json({ message: 'Invalid phone number format' });
      }

      // Format the phone number for verification using E.164 format
      const finalPhoneNumber = parsedPhoneNumber.format('E.164');
console.log("FinalNumber : ",finalPhoneNumber);
      // Check if the user exists
      const user = await deliveryPersonModel.findOne({ phonenumber: finalPhoneNumber });
      if (!user) {
          return res.status(404).json({ message: 'Delivery person not found' });
      }

      // Generate a 6-digit OTP (change to 4 digits if required)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP and expiration time in the user model
      user.otpToken = otp;
      user.otpExpire = Date.now() + 3600000; // OTP expires in 1 hour
      await user.save();

      // Prepare message for OTP
      const smsMessage = `Your OTP is ${otp}`;

      // Send OTP via Twilio
      try {
          const smsResponse = await twilioClient.messages.create({
              body: smsMessage,
              from: senderID, // Your verified Twilio phone number
              to: finalPhoneNumber
          });

          console.log("OTP sent successfully via Twilio:", messages.sid);

          return res.status(200).json({
              message: "OTP sent successfully to your phone",
              otpDetails: {
                  otp, // For debugging purposes, remove this in production
                  expiresIn: 3600
              }
          });
      } catch (smsError) {
          // Log full error details to help with debugging
          console.error("Failed to send OTP via Twilio:", smsError);

          // Check if the error is an authentication error (status 401, code 20003)
          if (smsError.status === 401 && smsError.code === 20003) {
              console.error("Twilio Authentication Error: Please verify your Twilio Account SID, Auth Token, and sender phone number.");
          }

          return res.status(500).json({
              message: "Failed to send OTP via SMS",
              errorDetails: smsError.message || smsError
          });
      }
  } catch (error) {
      console.error('Error generating OTP:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};





// Verify OTP
const verifyOtp = async (req, res) => {
    try {
        const { phonenumber, otp } = req.body;

        if (!phonenumber || !otp) {
            return res.status(400).json({ message: 'Phone number and OTP are required' });
        }

        const user = await deliveryPersonModel.findOne({ phonenumber });
        if (!user) {
            return res.status(404).json({ message: 'Delivery person not found' });
        }

        if (user.otpExpire < Date.now()) {
            return res.status(400).json({ message: 'OTP has expired' });
        }

        if (user.otpToken === otp) {
            user.otpToken = null;
            user.otpExpire = null;
            user.verified = true;
            await user.save();

            res.status(200).json({ message: 'OTP verified successfully' });
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await deliveryPersonModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Delivery person not found' });
        }

        const token = Math.floor(1000 + Math.random() * 9000).toString();
        user.resetPwdToken = token;
        user.resetPwdExpire = Date.now() + 3600000;
        await user.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'dharaneedharanchinnusamy@gmail.com', // Replace with your email
                pass: PASS
            }
        });

        const mailOptions = {
            from: 'dharaneedharanchinnusamy@gmail.com',
            to: user.email,
            subject: 'Password Reset Request',
            text: `Your reset token is ${token}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending reset email:', error);
                return res.status(500).json({ message: 'Failed to send reset email' });
            }

            res.status(200).json({ message: 'Reset email sent successfully' });
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Confirm password reset
const resetPasswordConfirm = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        const user = await deliveryPersonModel.findOne({
            resetPwdToken: token,
            resetPwdExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(404).json({ message: 'Invalid or expired token' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPwdToken = null;
        user.resetPwdExpire = null;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error confirming password reset:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};



// Ensure the folder exists, if not create it
const uploadFolder = path.resolve(__dirname, 'verification-documents');
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true }); // Creates the folder if it doesn't exist
}

// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder); // Set the destination folder dynamically
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename
  },
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF allowed.'));
  }
};

// Configure Multer to handle the upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB size limit
}).single('rcDocument'); // Ensure the form-data field is named 'rcDocument'

// The uploadRcDocument function
const uploadRcDocument = (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No RC document uploaded" });
    }

    // Successfully uploaded the RC document
    const filePath = req.file.path; // Get the path of the uploaded file

    try {
      const { phonenumber } = req.body;

      if (!phonenumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const deliveryPerson = await deliveryPersonModel.findOneAndUpdate(
        { phonenumber },
        { $set: { rcDocument: filePath } },
        { new: true }
      );

      if (!deliveryPerson) {
        return res.status(404).json({ message: "Delivery person not found" });
      }

      return res.status(200).json({
        message: "RC document uploaded successfully",
        filePath,
        deliveryPerson,
      });
    } catch (error) {
      console.error("Error updating delivery person:", error);
      res.status(500).json({ message: "Error saving RC document details" });
    }
  });
};

  
  const RiderToPostDetails = async (req, res) => {
    try {
      const { deliverypersonId, aadharcard, pancard, driving } = req.body;
  
      // Check for duplicate Aadhar card
      const Rideraadharcard = await deliveryPersonModel.findOne({ aadharcard });
      if (Rideraadharcard && Rideraadharcard.deliverypersonId !== deliverypersonId) {
        return res.status(400).json({ message: "Aadhar card already exists" });
      }
  
      // Check for duplicate PAN card
      const Riderpancard = await deliveryPersonModel.findOne({ pancard });
      if (Riderpancard && Riderpancard.deliverypersonId !== deliverypersonId) {
        return res.status(400).json({ message: "PAN card already exists" });
      }
  
      // Check for duplicate Driving license
      const Riderdriving = await deliveryPersonModel.findOne({ driving });
      if (Riderdriving && Riderdriving.deliverypersonId !== deliverypersonId) {
        return res.status(400).json({ message: "Driving license already exists" });
      }
  
      // Update the delivery person's details or create a new one if not found
      const newRider = await deliveryPersonModel.findOneAndUpdate(
        { deliverypersonId }, // Filter by deliverypersonId
        {
          aadharcard,
          pancard,
          driving,
        },
        {
          new: true, // Return the updated document
          upsert: true, // Create a new document if none matches
        }
      );
  
      // Send success response
      res.status(201).json({
        message: "Delivery person details updated successfully",
        rider: newRider,
      });
    } catch (error) {
      console.error("Error saving delivery person details:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  

  const getRcDocument = async (req, res) => {
    const { phonenumber } = req.params; // Extract phonenumber from URL params
  
    try {
      // Find the delivery person by phonenumber, excluding sensitive fields
      const deliveryPerson = await deliveryPersonModel.findOne(
        { phonenumber: phonenumber },
        { password: 0, otpToken: 0, otpExpire: 0, availability: 0, __v: 0 } // Exclude unnecessary fields
      );
  
      if (!deliveryPerson) {
        return res.status(404).json({ message: "Delivery person not found" });
      }
  
      // Check if RC document exists
      if (!deliveryPerson.rcDocument || deliveryPerson.rcDocument.length === 0) {
        return res.status(404).json({ message: "RC document not found" });
      }
  
      // Return only relevant details
      return res.status(200).json({
        message: "RC document retrieved successfully",
        riderDetails: {
          deliverypersonId: deliveryPerson.deliverypersonId,
          name: deliveryPerson.name,
          email: deliveryPerson.email,
          phonenumber: deliveryPerson.phonenumber,
          isVerified: deliveryPerson.isVerified,
          aadharcard: deliveryPerson.aadharcard,
          driving: deliveryPerson.driving,
          pancard: deliveryPerson.pancard,
          rcDocument: deliveryPerson.rcDocument, // Path to the RC document
        },
      });
    } catch (error) {
      console.error("Error retrieving RC document:", error);
      res.status(500).json({ message: "Error retrieving RC document" });
    }
  };
  
  // Endpoint to mark delivery person as verified
const verifyDeliveryPerson = async (req, res) => {
    try {
      const { phonenumber } = req.params;
  
      // Find the delivery person and update the `isVerified` field
      const deliveryPerson = await deliveryPersonModel.findOneAndUpdate(
        { phonenumber: phonenumber },
        { isVerified: true },
        { new: true }
      );
  
      if (!deliveryPerson) {
        return res.status(404).json({ message: "Delivery person not found" });
      }
  
      return res.status(200).json({
        message: "Delivery person verified successfully",
        deliveryPerson: {
          name: deliveryPerson.name,
          phone: deliveryPerson.phonenumber,
          isVerified: deliveryPerson.isVerified,
        },
      });
    } catch (error) {
      console.error('Error verifying delivery person:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
  
  const getVerifiedDeliveryPersons = async (req, res) => {
    try {
      const verifiedPersons = await deliveryPersonModel.find(
        { isVerified: true },
        { password: 0, otpToken: 0, otpExpire: 0, availability: 0, __v: 0 } // Hide sensitive fields
      );
  
      // Check if the array is empty
      if (!verifiedPersons) {
        return res.status(404).json({ message: "No verified delivery persons found" });
      }
  
      return res.status(200).json({
        message: "Verified delivery persons fetched successfully",
        data: verifiedPersons,
      });
    } catch (error) {
      console.error("Error fetching verified delivery persons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  
  
  const getUnverifiedDeliveryPersons = async (req, res) => {
    try {
      const unverifiedPersons = await deliveryPersonModel.find(
        { isVerified: false },
        { password: 0, otpToken: 0, otpExpire: 0, availability: 0, __v: 0 } 
      );
  
      if (!unverifiedPersons) {
        return res.status(404).json({ message: "No unverified delivery persons found" });
      }
  
      return res.status(200).json({
        message: "Unverified delivery persons fetched successfully",
        data: unverifiedPersons,
      });
    } catch (error) {
      console.error("Error fetching unverified delivery persons:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  
module.exports = {
    DeliverypersonLogin,
    DeliverypersonRegister,
    sendOtp,
    verifyOtp,
    resetPassword,
    resetPasswordConfirm,
    uploadRcDocument,
    getRcDocument,
    RiderToPostDetails,
    verifyDeliveryPerson,
    getVerifiedDeliveryPersons,
    getUnverifiedDeliveryPersons
};
