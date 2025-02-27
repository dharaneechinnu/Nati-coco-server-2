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

const getAvailableSlots = async (req, res) => {
  try {
      // Use req.body to get date and type from the request body
      const { date, type } = req.body;

      let filter = { date };

      // If a type is provided, filter by slot type (regular/express)
      if (type) {
          filter.type = type;
      }

      // Use $expr to compare bookedOrders with maxOrders
      filter.$expr = { $lt: ["$bookedOrders", "$maxOrders"] };

      // Fetch available slots from MongoDB using the filter
      const availableSlots = await Slot.find(filter);

      // Return the available slots
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