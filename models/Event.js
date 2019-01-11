const mongoose = require('mongoose');

const EventSchema = mongoose.Schema({
  type: {
    type: String,
    enum: ['absence', 'intervention', 'unavailability', 'internalHour']
  },
  subType: String,
  startDate: Date,
  endDate: Date,
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  subscription: { type: mongoose.Schema.Types.ObjectId },
  location: {
    street: String,
    fullAddress: String,
    zipCode: String,
    city: String
  },
  misc: String,
  attachment: {
    link: String,
    driveId: String,
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', EventSchema);
