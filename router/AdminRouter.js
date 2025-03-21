const express = require('express');
const router = express.Router();
const verifyToken = require('../Middleware/AdminMiddleware');
const {loginAdmin,AddChickenStore } = require('../Controller/Admin/AdminController');
const { getCityOwners,addAdminMenuItem,DeleteStoreById,renameStore } = require('../Controller/Admin/AdminController');

//Admin Login Router
router.route('/login').post(loginAdmin);

router.route('/Additem').post(addAdminMenuItem);
//Add CityStore Admin router 
router.route('/addcitystore').post(AddChickenStore);

router.delete('/deleteStore/:storeId', DeleteStoreById);


router.put('/renameStore/:storeId', renameStore); // PUT request to rename the store

// GET route to fetch all city owners
router.get('/cityowners', getCityOwners);

module.exports = router;