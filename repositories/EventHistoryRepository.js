const EventHistory = require('../models/EventHistory');

exports.getEventHistoryList = rules => EventHistory
  .find(rules)
  .populate({ path: 'auxiliaries', select: '_id identity' })
  .populate({ path: 'createdBy', select: '_id identity picture' })
  .populate({ path: 'event.customer', select: '_id identity' })
  .populate({ path: 'event.auxiliary', select: '_id identity' })
  .populate({ path: 'update.auxiliary.from', select: '_id identity' })
  .populate({ path: 'update.auxiliary.to', select: '_id identity' })
  .sort({ createdAt: -1 })
  .limit(100);
