const get = require('lodash/get');
const Sector = require('../models/Sector');

exports.list = async credentials => Sector.find({ company: get(credentials, 'company._id') }).lean();

exports.create = async (payload, credentials) => {
  const sector = await Sector.create({ ...payload, company: get(credentials, 'company._id') });

  return sector.toObject();
};

exports.update = async (sectorId, payload) => Sector
  .findOneAndUpdate({ _id: sectorId }, { $set: payload }, { new: true })
  .lean();

exports.remove = async sectorId => Sector.deleteOne({ _id: sectorId });
