const get = require('lodash/get');
const Boom = require('@hapi/boom');
const Sector = require('../models/Sector');
const translate = require('./translate');

const { language } = translate;

exports.list = async credentials => Sector.find({ company: get(credentials, 'company._id') }).lean();

exports.create = async (payload, credentials) => Sector.create({ ...payload, company: get(credentials, 'company._id') })
  .toObject();

exports.update = async (sectorId, payload, credentials) => {
  const existingSector = await Sector.countDocuments({ name: payload.name, company: get(credentials, 'company._id') });
  if (existingSector) throw Boom.conflict(translate[language].sectorAlreadyExists);

  return Sector.findOneAndUpdate({ _id: sectorId }, { $set: payload }, { new: true }).lean();
};

exports.remove = async sectorId => Sector.deleteOne({ _id: sectorId });
