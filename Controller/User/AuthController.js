require('dotenv').config();
const userModel = require('../../models/UserModel');
const twilio = require('twilio');

// Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const senderID = process.env.TWILIO_SENDER_ID;
const twilioClient = twilio(accountSid, authToken);

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOtp = async (req, res) => {
    try {
        const { mobileno } = req.body;

        if (!mobileno) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        let user = await userModel.findOne({ mobileno });
        if (!user) {
            user = await userModel.create({ mobileno });
        }

        const otp = generateOTP();
        console.log("Generated OTP:", otp);

        twilioClient.messages
            .create({
                body: `Your verification code is: ${otp}`,
                from: senderID,
                to: mobileno
            })
            .then(async () => {
                user.otpToken = otp;
                user.otpExpire = Date.now() + 5 * 60 * 1000; // OTP expires in 5 minutes
                await user.save();

                res.status(200).json({ message: "OTP sent successfully", expiresIn: 300 });
            })
            .catch((error) => {
                console.error("Twilio Error:", error);
                res.status(500).json({ message: "Failed to send OTP", errorDetails: error.message });
            });

    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { mobileno, otp } = req.body;

        if (!mobileno || !otp) {
            return res.status(400).json({ message: "Phone number and OTP are required" });
        }

        const user = await userModel.findOne({ mobileno });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.otpToken || user.otpExpire < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (user.otpToken !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        user.otpToken = null;
        user.otpExpire = null;
        user.verified = true;
        await user.save();

        res.status(200).json({ message: "OTP verified successfully", user });

    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get user by ID
const GetOneUser = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user });

    } catch (error) {
        console.error("Error fetching user by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find();
        res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

module.exports = { sendOtp, verifyOtp, GetOneUser, getAllUsers };
