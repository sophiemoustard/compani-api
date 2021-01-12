const ActivityHistory = require('../models/ActivityHistory');

exports.addActivityHistory = async payload => ActivityHistory.create(payload);

exports.list = async query => ActivityHistory
  .find({ date: { $lte: new Date(query.endDate), $gte: new Date(query.startDate) } })
  .lean();
