const { Schema, model } = require('mongoose');

const complaintSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true, // The user who is submitting the complaint
    },
    bagNumber: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now, // Date of the complaint submission
    },
    typeOfComplaint: {
      type: String,
      enum: ['Service Quality', 'Delay', 'Damage Items', 'Communication'],
      required: true, // Type of complaint
    },
    description: {
      type: String,
      required: true, // Complaint description
    },
    userName: {
      type: String,
      required: true, // User's name
    },
    userAddress: {
      type: String,
      required: true, // User's address or college (building and room)
    },
  },
  {
    collection: 'complaints', // Explicitly set the collection name
  }
);

module.exports = model('Complaint', complaintSchema);
