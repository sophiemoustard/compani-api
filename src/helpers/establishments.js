const get = require('lodash/get');
const Establishment = require('../models/Establishment');

exports.create = async (establishmentPayload, credentials) => {
  const payload = { ...establishmentPayload, company: get(credentials, 'company._id', null) };
  const establishment = await Establishment.create(payload);

  return establishment.toObject();
};

exports.update = async (id, establishmentPayload) => Establishment
  .findOneAndUpdate({ _id: id }, { $set: establishmentPayload }, { new: true })
  .lean();

exports.list = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);

  return Establishment.find({ company: companyId })
    .populate({ path: 'usersCount', match: { company: companyId } })
    .lean({ virtuals: true });
};

exports.remove = async id => Establishment.deleteOne({ _id: id });
