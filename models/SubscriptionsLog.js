const mongoose = require('mongoose');

const SubscriptionsLogSchema = mongoose.Schema({
  customer: {
    customerId: { type: mongoose.Schema.Types.ObjectId },
    firstname: String,
    lastname: String,
    ogustId: String
  },
  subscriptions: {
    name: String,
    unitTTCRate: Number,
    estimatedWeeklyVolume: Number,
    evenings: Number,
    sundays: Number
  },
  deletedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SubscriptionsLog', SubscriptionsLogSchema);
