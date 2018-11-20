const mongoose = require('mongoose');

const CustomerSchema = mongoose.Schema({
  customerId: String,
  title: String,
  firstname: String,
  lastname: String,
  email: String,
  phone: String,
  contact: {
    ogustAddressId: String,
    address: String,
    additionalAddress: String,
    zipCode: String,
    city: String,
    doorCode: String,
    intercomCode: String
  },
  followUp: {
    pathology: String,
    comments: String,
    details: String,
    misc: String,
    referent: String
  },
  isActive: Boolean,
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
