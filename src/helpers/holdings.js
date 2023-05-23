const Holding = require('../models/Holding');

exports.create = async payload => Holding
  .create({ name: payload.name, ...(Object.keys(payload.address).length && { address: payload.address }) });

exports.list = async () => Holding.find({}, { _id: 1, name: 1 }).lean();
