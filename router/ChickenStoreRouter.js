const express = require('express');
const router = express.Router();
const {CityStoreLogin,updateStoreAvailability,addMenuItem,updateMenuItem,PostPreOrder,deleteMenuItem,getOrders, getMenuItems,getMenuItemsByCategory,updateOrder} = require('../Controller/ChickenStore/ChickenStoreController')
 
 
//cityStore Login Router
router.post('/Login',CityStoreLogin);
//cityStore Add Menu Item Router
router.post('/Addmenu',addMenuItem);
//cityStore Update Menu Item Routera
router.put('/Updatemenu/:id',updateMenuItem);
//cityStore Delete Menu Item Router
router.delete('/Deletemenu/:id',deleteMenuItem);
//citystore GetMenu item Router
router.get('/getallmenu',getMenuItems)
router.get('/getcarmenu',getMenuItemsByCategory)
//cityStore GetOrder item Router
router.get('/orders/:storeId', getOrders);

router.post('/updateorder', updateOrder);

// PUT route to update store availability
router.put('/availability', updateStoreAvailability);

router.post('/preorder',PostPreOrder);
 
module.exports = router;