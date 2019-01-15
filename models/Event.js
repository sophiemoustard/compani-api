const mongoose = require('mongoose');
const {
  INTERNAL_HOUR,
  ABSENCE,
  UNAVAILABILITY,
  INTERVENTION
} = require('../helpers/constants');

const EventSchema = mongoose.Schema({
  type: {
    type: String,
    enum: [ABSENCE, INTERNAL_HOUR, INTERVENTION, UNAVAILABILITY]
  },
  subType: String,
  startDate: Date,
  endDate: Date,
  auxiliary: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sector: String,
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  subscription: { type: mongoose.Schema.Types.ObjectId },
  internalHour: { type: mongoose.Schema.Types.ObjectId },
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
