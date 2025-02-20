const express = require('express');
const{PostUserLiveLocation,postUserAddress,GetLiveLocation,getOrderHistory,getUserAddresses} = require('../Controller/User/LocationController');

const router = express.Router();

router.patch('/live-location',PostUserLiveLocation);

router.get('/live-location/:userId', GetLiveLocation);

router.post('/address',postUserAddress);
router.get('/address/:userId',getUserAddresses);


//Suresh Assiged
router.get('/deliveryPerson/:id/orderHistory', getOrderHistory);

module.exports = router;

