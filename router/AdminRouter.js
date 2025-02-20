const express = require('express');
const router = express.Router();
const verifyToken = require('../Middleware/AdminMiddleware');
const {loginAdmin,AddChickenStore } = require('../Controller/Admin/AdminController');
const { getCityOwners } = require('../Controller/Admin/AdminController');

//Admin Login Router
router.route('/login').post(loginAdmin);

//Add CityStore Admin router 
router.route('/addcitystore').post(AddChickenStore);


// GET route to fetch all city owners
router.get('/cityowners', getCityOwners);

module.exports = router;