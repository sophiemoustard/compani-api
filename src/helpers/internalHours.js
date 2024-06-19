const get = require('lodash/get');
const InternalHour = require('../models/InternalHour');

exports.list = async credentials => InternalHour.find({ company: get(credentials, 'company._id') }).lean();
