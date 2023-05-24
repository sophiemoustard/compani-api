const Holding = require('../models/Holding');

exports.create = async payload => Holding.create(payload);

exports.list = async () => Holding.find({}, { _id: 1, name: 1 }).lean();
