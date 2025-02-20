const Cart = require("../../models/AddToCart");
const mongoose = require("mongoose");


const addToCart = async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {

    let cart = await Cart.findOne({ userId });

    if (cart) {
   
      const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
      if (itemIndex > -1) {
        
        cart.items[itemIndex].quantity += quantity;
      } else {
       
        cart.items.push({ productId, quantity });
      }
    } else {
  
      cart = new Cart({
        userId,
        items: [{ productId, quantity }],
      });
    }

    await cart.save();
    res.status(200).json({ message: "Item added to cart successfully!", cart });
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};



const getCart = async (req, res) => {
  console.log("Received userId:", req.params.userId); // Debug log

  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const objectUserId = new mongoose.Types.ObjectId(userId); // Explicit ObjectId conversion

    const cart = await Cart.findOne({ userId: objectUserId }).populate("items.productId");

    if (cart) {
      return res.status(200).json(cart);
    } else {
      return res.status(404).json({ message: "Cart not found!" });
    }
  } catch (error) {
    console.error("Error fetching cart:", error);
    return res.status(500).json({ message: "Internal Server Error!" });
  }
};




const removeFromCart = async (req, res) => {
  const { userId, productId } = req.body;

  try {
    const cart = await Cart.findOne({ userId });

    if (cart) {
     
      cart.items = cart.items.filter(item => item.productId.toString() !== productId);

      await cart.save();
      res.status(200).json({ message: "Item removed from cart successfully!", cart });
    } else {
      res.status(404).json({ message: "Cart not found!" });
    }
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};

module.exports = {addToCart,getCart,removeFromCart};
