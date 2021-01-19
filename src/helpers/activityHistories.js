const ActivityHistory = require('../models/ActivityHistory');
const User = require('../models/User');

exports.addActivityHistory = async payload => ActivityHistory.create(payload);

exports.list = async (query, credentials) => {
  const users = await User.find({ company: credentials.company._id }, { _id: 1 }).lean();

  return ActivityHistory
    .find({
      date: { $lte: new Date(query.endDate), $gte: new Date(query.startDate) },
      user: { $in: users.map(u => u._id) },
    })
    .lean();
};
