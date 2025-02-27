const express = require("express");
const router = express.Router();
const { addSlot, getAvailableSlots, deleteSlot } = require("../Controller/User/SlotController");

router.post("/admin/add-slot", addSlot); // Admin adds a slot dynamically
router.post("/getslots", getAvailableSlots); // Get available slots (Regular & Express)
router.delete("/admin/delete-slot", deleteSlot); // Admin deletes a slot

module.exports = router;