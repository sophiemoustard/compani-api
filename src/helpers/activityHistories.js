const ActivityHistory = require('../models/ActivityHistory');

exports.addActivityHistory = async payload => ActivityHistory.create(payload);
