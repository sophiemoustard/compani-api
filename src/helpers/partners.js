const flat = require('flat');
const Partner = require('../models/Partner');

exports.list = async credentials => Partner.find({ company: credentials.company._id }).lean();

exports.update = async (partnerId, payload) => Partner.updateOne({ _id: partnerId }, { $set: flat(payload) });
