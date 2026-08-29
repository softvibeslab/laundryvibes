const { Schema, model } = require('mongoose');


const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensure unique email
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'], // Email format validation
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true, // Ensure unique phone number
    },
    buildingName: {
      type: String,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    bagNumber: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6, // Minimum password length
      select: false,
    },
    role: {
      type: String,
      enum : ['admin', 'user', 'worker'],
      default: "user"
    },
    address: {
      type: String,
      default : " ",
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type:Date,
      select: false,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: { transform(doc, ret) { delete ret.password; delete ret.resetPasswordToken; delete ret.resetPasswordExpires; return ret; } },
  }
);

module.exports = model('User', userSchema);
