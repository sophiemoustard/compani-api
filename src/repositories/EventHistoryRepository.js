const EventHistory = require('../models/EventHistory');

exports.paginate = async (query, limit = 0) => EventHistory
  .find(query)
  .populate({ path: 'auxiliaries', select: '_id identity' })
  .populate({ path: 'createdBy', select: '_id identity picture' })
  .populate({ path: 'event.customer', select: '_id identity' })
  .populate({ path: 'event.auxiliary', select: '_id identity' })
  .populate({ path: 'event.internalHour', select: 'name' })
  .populate({ path: 'update.auxiliary.from', select: '_id identity' })
  .populate({ path: 'update.auxiliary.to', select: '_id identity' })
  .populate({ path: 'linkedEventHistory', select: '_id update' })
  .sort({ createdAt: -1 })
  .limit(limit);
