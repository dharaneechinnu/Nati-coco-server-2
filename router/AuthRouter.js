require('dotenv').config();
const express = require('express');
const router = express.Router();

router.route('/login').post(require('../Controller/User/AuthController').login);
router.route('/Register').post(require('../Controller/User/AuthController').register);
router.route('/users').get(require('../Controller/User/AuthController').getUsers);

router.route('/generate-otp').post(require('../Controller/User/AuthController').getOtp);
router.route('/verify-otp').post(require('../Controller/User/AuthController').Verifyotp);
router.route('/reset-password').post(require('../Controller/User/AuthController').resetPassword);
router.route('/resetpass-otp').patch(require('../Controller/User/AuthController').respassword);


module.exports = router;