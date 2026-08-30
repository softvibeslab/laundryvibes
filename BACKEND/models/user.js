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
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'],
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
    active: { type: Boolean, default: true, required: true },
    tokenVersion: { type: Number, default: 0, min: 0, required: true, select: false },
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

userSchema.pre('save', async function revokeChangedAccount() {
  if (!this.isNew && (this.isModified('password') || this.isModified('active') || this.isModified('role'))) {
    let currentVersion = this.tokenVersion;
    if (!Number.isSafeInteger(currentVersion)) {
      const stored = await this.constructor.findById(this._id).select('+tokenVersion').lean();
      currentVersion = stored?.tokenVersion;
    }
    this.tokenVersion = (Number.isSafeInteger(currentVersion) ? currentVersion : 0) + 1;
  }
});

module.exports = model('User', userSchema);
