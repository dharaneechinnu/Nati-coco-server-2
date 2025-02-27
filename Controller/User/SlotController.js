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
      const { date, type } = req.body;

      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
  
      let filter = { date: parsedDate };
      if (type) filter.type = type;
  
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

export { addSlot, getAvailableSlots, deleteSlot };