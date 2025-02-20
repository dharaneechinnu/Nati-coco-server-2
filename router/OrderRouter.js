const express = require("express");
const { createOrder,PostPreOrder,GetOrderByStoreId, getOrderAnalytics,verifyAndComplete,markOrderReadyAndAssignDelivery,getMyOrders,getOrderByOrderId } = require("../Controller/User/OrderController");

const router = express.Router();

//Place Order
router.post("/placeorder", createOrder);

//Get Order Analytics
router.get("/analytics", getOrderAnalytics);

router.post('/markreadyAndAssign', markOrderReadyAndAssignDelivery);
router.post('/verifyandcomplete', verifyAndComplete);
router.get("/myorders/:userId", getMyOrders);
router.post('/getorderId',getOrderByOrderId);

router.post('/preorder',PostPreOrder)

router.get('/getorder/:storeId',GetOrderByStoreId)
module.exports = router;
