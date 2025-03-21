const express = require('express');
const router = express.Router();
const {findNearestStoreAndDisplayMenu,getHelpOrderStoreDetails,GeneratedUserOTP,GetUserOTP} =  require("../Controller/User/OrderController");
const {GetOneUser,getAllUsers} =require("../Controller/User/AuthController");
router.post('/nearest', findNearestStoreAndDisplayMenu);

router.post('/helporder',getHelpOrderStoreDetails);

router.get("/getOneUser/:userId",GetOneUser);

router.get("/GetAllUser",getAllUsers);

router.post('/postUserOTP',GeneratedUserOTP);

router.post('/getuserOTP',GetUserOTP);


module.exports = router;