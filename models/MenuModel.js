const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'citystore', 
  },
  category: {
    type: String, 
    required: true,
  },
  subCategory: {
    type: String, 
  },
  itemName: {
    type: String, 
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  Grams:{
    type:Number,
  },
  Piece:{
    type:String,
  },
  stock: {
    type: Number,
    required: false,
  },
  image: {
    type: String,
  },
  availability: {
    type: Boolean,
    default: true,
  },
  BestSeller:{
    type:Boolean,
    default:true,
  },
  newArrival:{
    type:Boolean,
    default:true,
  }
});

const MenuModel = mongoose.model('Menu', MenuSchema);

module.exports = MenuModel;
