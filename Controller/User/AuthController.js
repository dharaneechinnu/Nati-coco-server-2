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

        // Check if user exists or create a new one
        let user = await userModel.findOne({ mobileno });
        if (!user) {
            user = await userModel.create({ mobileno });
        }

        // Generate OTP
        const otp = generateOTP();
        console.log("Generated OTP:", otp);

        // Send OTP via Twilio
        twilioClient.messages
            .create({
                body: `Your verification code is: ${otp}`,
                from: senderID, // Twilio-approved number
                to: mobileno
            })
            .then(async () => {
                // Save OTP & expiry time in DB
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

        // Find user
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

        // OTP Verified - Update user status
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


module.exports = { sendOtp, verifyOtp };
