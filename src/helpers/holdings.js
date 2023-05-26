const CompanyHolding = require('../models/CompanyHolding');
const Holding = require('../models/Holding');

exports.create = async payload => Holding.create(payload);

exports.list = async () => Holding.find({}, { _id: 1, name: 1 }).lean();

exports.update = async (holdingId, payload) => CompanyHolding.create({ holding: holdingId, company: payload.company });

exports.getById = async holdingId => Holding
  .findOne({ _id: holdingId }, { _id: 1, name: 1 })
  .populate({ path: 'companyHoldingList', populate: { path: 'company', select: 'name' } })
  .lean();
