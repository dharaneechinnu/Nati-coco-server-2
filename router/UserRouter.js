const express = require('express');
const router = express.Router();
const {findNearestStoreAndDisplayMenu,getHelpOrderStoreDetails,GeneratedUserOTP,GetUserOTP} =  require("../Controller/User/OrderController");

router.post('/nearest', findNearestStoreAndDisplayMenu);

router.post('/helporder',getHelpOrderStoreDetails);


router.post('/postUserOTP',GeneratedUserOTP);

router.post('/getuserOTP',GetUserOTP);


module.exports = router;