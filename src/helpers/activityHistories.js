const ActivityHistory = require('../models/ActivityHistory');

exports.addActivityHistory = async (payload) => {
  await ActivityHistory.create(payload);
};
