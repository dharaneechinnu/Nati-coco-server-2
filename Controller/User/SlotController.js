const Slot = require("../../models/SlotModel");

// Admin Adds Slots Dynamically
const addSlot = async (req, res) => {
  try {
    const { date, startTime, endTime, maxOrders, type } = req.body;

    const newSlot = new Slot({
      date,
      startTime,
      endTime,
      maxOrders,
      bookedOrders: 0,
      type: type || "regular",
    });

    await newSlot.save();
    res.status(201).json({ message: "Slot added successfully!", slot: newSlot });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

// Get Available Slots (Regular & Express)
const getAvailableSlots = async (req, res) => {
    try {
      const { date, type } = req.body; // Use req.query instead of req.body
  
      let filter = { date };
      if (type) filter.type = type; // Filter by slot type (regular/express)
  
      // Use $expr to compare bookedOrders with maxOrders
      filter.$expr = { $lt: ["$bookedOrders", "$maxOrders"] };
  
      const availableSlots = await Slot.find(filter);
      res.json(availableSlots);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  

// Admin Deletes a Slot
const deleteSlot = async (req, res) => {
  try {
    const { slotId } = req.body;
    await Slot.findByIdAndDelete(slotId);
    res.json({ message: "Slot deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = { addSlot, getAvailableSlots, deleteSlot };