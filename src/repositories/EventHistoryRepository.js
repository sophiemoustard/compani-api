const EventHistory = require('../models/EventHistory');

exports.paginate = async (query, createdAt = null, limit = 0) => {
  const params = { ...query };
  if (createdAt) params.createdAt = { $lt: createdAt };

  return EventHistory
    .find(params)
    .populate({ path: 'auxiliaries', select: '_id identity' })
    .populate({ path: 'createdBy', select: '_id identity picture' })
    .populate({ path: 'event.customer', select: '_id identity' })
    .populate({ path: 'event.auxiliary', select: '_id identity' })
    .populate({ path: 'event.internalHour', select: 'name' })
    .populate({ path: 'update.auxiliary.from', select: '_id identity' })
    .populate({ path: 'update.auxiliary.to', select: '_id identity' })
    .sort({ createdAt: -1 })
    .limit(limit);
};
