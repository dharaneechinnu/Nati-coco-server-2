const express = require("express");
const { updateLocation,getDeliveryOrders,getDeliveryLocation,getDeliveryPersonLocation,updateRiderAvailability,findNearestDeliveryPerson, updateDeliveryStatus, getOrderHistory,fetchOtp } = require("../Controller/Rider/DeliveryPerson");
const {  getDeliveryPersons } = require("../Controller/ChickenStore/ChickenStoreController");
const {DeliverypersonLogin,RiderToPostDetails,  DeliverypersonRegister,sendOtp,verifyOtp,resetPassword,resetPasswordConfirm,uploadRcDocument,getRcDocument,verifyDeliveryPerson,getVerifiedDeliveryPersons,getUnverifiedDeliveryPersons } = require('../Controller/Rider/DeliveryAuth')
const router = express.Router();


//Delivery Login Credentials
router.post('/login',DeliverypersonLogin)
router.post('/Register',DeliverypersonRegister)
router.post('/generate-otp',sendOtp)
router.post('/verify-otp',verifyOtp)
router.post('/reset-password',resetPassword)
router.patch('/resetpass-otp',resetPasswordConfirm)
router.post('/postdetails',RiderToPostDetails)
router.post('/rcdocument',uploadRcDocument)



router.get('/:phonenumber', getRcDocument);
router.post('/riderverified',getVerifiedDeliveryPersons);
router.post('/riderUnverified',getUnverifiedDeliveryPersons);
// PUT route to mark delivery person as verified
router.put('/:phonenumber', verifyDeliveryPerson);


//check this
router.post('/getDeliveryPerson',getDeliveryPersons);
router.post("/update-location", updateLocation);
router.get("/location/:orderId", getDeliveryPersonLocation);
router.post("/find-nearest", findNearestDeliveryPerson);




// Route to update delivery status
// router.post("/update-delivery-status", updateDeliveryStatus);

// Route to get order history
router.get("/order-history/:userId", getOrderHistory);


router.patch('/availability/:id', updateRiderAvailability);
// Get all orders for a delivery person
router.get('/orders/:deliveryPersonId', getDeliveryOrders);

// Update order status
router.patch('/order/:orderId/status', updateDeliveryStatus);

router.post('/deliveryocation', getDeliveryLocation);

router.post('/getOtp',fetchOtp)

module.exports = router;
