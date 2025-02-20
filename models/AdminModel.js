const mongoose =require('mongoose');

const AdminSchema = new mongoose.Schema({
    name: {
       type: String,
       required: true
       },
    email: { 
      type: String,
       required: true,
        unique: true
       },
    password: { 
      type: String,
       required: true
       },
       mobileno:{
         type:Number,
         required:true,
       },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin',
        required: true,
      },
})

const AdminModel = mongoose.model("AdminSchema",AdminSchema);

module.exports = AdminModel;