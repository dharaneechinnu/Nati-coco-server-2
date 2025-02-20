require('dotenv').config();
const usermodel = require('../../models/UserModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const PASS = process.env.PASS;
const nodemailer = require('nodemailer');
const { isValidPhoneNumber, parsePhoneNumber } = require('libphonenumber-js');
const twilio = require('twilio');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);
const senderID = process.env.TWILIO_SENDER_ID;

const login = async (req, res) => {
    try {
        const { mobileno, password } = req.body;
 console.log(mobileno,password)
        if (!mobileno || !password) {
            return res.status(400).json({ message: "Enter all fields" });
        }
 
        const user = await usermodel.findOne({ mobileno });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
 
        const isValidate = await bcrypt.compare(password, user.password);
        if (isValidate) {
            const { password, ...userWithoutPassword } = user.toObject();
 
            const accessToken = jwt.sign(
                { mobileno: mobileno, userId: user._id },
                process.env.ACCESS_TOKEN,
                { expiresIn: '1d' }
            );
 
            res.status(200).json({
                accessToken,
                user: {
                    userId: user._id,
                    name: user.name,
                    mobileno: user.mobileno,
                    email: user.email,
                }
            });
        } else {
            res.status(400).json({ message: "Enter valid Password" });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
 
const register = async (req, res) => {
    try {
        const { name, email, password, mobileno } = req.body;
 
        if (!name || !email || !password || !mobileno) {
            return res.status(400).json({ message: "Enter all the fields" });
        }
 
        const user = await usermodel.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists" });
        }
 
        const hashpwd = await bcrypt.hash(password, 10);
 
        await usermodel.create({ name, password: hashpwd, email, mobileno });
 
        res.status(200).json({ message: "User registered successfully" });
 
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
 
 


const getOtp = async (req, res) => {
    try {
        // Check if request body is valid
        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({ message: "Invalid request body" });
        }

        const { phoneNumber } = req.body;
        console.log("Received phone number:", phoneNumber);

        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // Validate and format the phone number
        let parsedPhoneNumber;
        try {
            parsedPhoneNumber = parsePhoneNumber(phoneNumber);
        } catch (error) {
            return res.status(400).json({ message: "Invalid phone number format" });
        }

        if (!parsedPhoneNumber.isValid()) {
            return res.status(400).json({ message: "Invalid phone number format" });
        }

        const finalPhoneNumber = parsedPhoneNumber.format('E.164');

        // Check if the user exists
        let user = await usermodel.findOne({ mobileno: finalPhoneNumber });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("Generated OTP:", otp);

        // Send OTP via Twilio
        twilioClient.messages
            .create({
                body:` Your Naticoco verification code is: ${otp}`,
                from: senderID, // Use sender ID or a Twilio-approved phone number
                to: finalPhoneNumber
            })
            .then(async (message) => {
                console.log("Twilio message SID:", message.sid);

                // Save OTP and expiry to the database
                user.otpToken = otp;
                user.otpExpire = Date.now() + 3600000; // 1 hour validity
                await user.save();

                return res.status(200).json({
                    message: "OTP sent successfully to your phone",
                    expiresIn: 3600
                });
            })
            .catch((error) => {
                console.error("Twilio Error:", error);
                return res.status(500).json({
                    message: "Failed to send OTP via Twilio",
                    errorDetails: error.message
                });
            });
    } 
    catch (error) {
        console.error("Error generating OTP:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
 
const Verifyotp = async (req, res) => {
    try {
        const { phoneNumber, otp } = req.body;
 
        if (!phoneNumber || !otp) {
            return res.status(400).json({ message: "Phone number and OTP are required" });
        }
 
        const user = await usermodel.findOne({ mobileno: phoneNumber });
 
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
 
        if (user.otpExpire < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }
 
        if (user.otpToken === otp) {
            // Clear OTP data and mark user as verified
            user.otpToken = null;
            user.otpExpire = null;
            user.verified = true;
            await user.save();
 
            return res.status(200).json({ message: "OTP verified successfully" });
        } else {
            return res.status(400).json({ message: "Invalid OTP" });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
 
const resetPassword = async (req, res) => {
    const { email } = req.body;
 
    function generateOTP() {
        return Math.floor(1000 + Math.random() * 9000).toString();
    }
 
    try {
        const user = await usermodel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
 
        const token = generateOTP();
 
        user.resetPwdToken = token;
        user.resetPwdExpire = Date.now() + 3600000; // Expire after 1 hour
 
        await user.save();
 
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "dharaneedharanchinnusamy@gmail.com",
                pass: PASS
            }
        });
 
        const mailOptions = {
            from: "dharaneedharanchinnusamy@gmail.com",
            to: user.email,
            subject: "Password Reset Request",
            text: `Hello ${user.name},\n\nYou requested to reset your password. Please use the following token to reset your password:\n\n${token}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nYour App Team`
        };
 
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending password reset email:", error);
                return res.status(500).json({ message: "Failed to send password reset email" });
            }
 
            console.log("Password reset email sent:", info.response, token);
            res.status(200).json({ message: "Password reset email sent" });
        });
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
 
const respassword = async (req, res) => {
    const { token, pwd } = req.body;
    if (!token || !pwd) {
        return res.status(400).json({ message: "Token and new password are required" });
    }
 
    try {
        const user = await usermodel.findOne({
            resetPwdToken: token,
            resetPwdExpire: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(404).json({ message: "Invalid or expired token" });
        }
        if (pwd.length < 6) {
            return res.status(400).json({ message: "Password is too short. It must be at least 6 characters long." });
        }
        const hashedPassword = await bcrypt.hash(pwd, 10);
 
        user.password = hashedPassword;
        user.resetPwdToken = null;
        user.resetPwdExpire = null;
        await user.save();
 
        console.log("Password reset successfully");
        res.status(200).json({ message: "Password reset successfully" });
 
    } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await usermodel.find({});
        res.status(200).json({ users: users }); // Wrapping users in an object
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

module.exports = { login, register, getOtp, resetPassword, Verifyotp, respassword, getUsers };