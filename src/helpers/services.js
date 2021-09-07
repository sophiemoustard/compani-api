const get = require('lodash/get');
const Service = require('../models/Service');

exports.list = async (credentials, query) => {
  const companyId = get(credentials, 'company._id') || '';
  return Service.find({ ...query, company: companyId })
    .populate({ path: 'versions.surcharge', match: { company: companyId } })
    .lean();
};

exports.create = async (companyId, payload) => {
  const service = new Service({ ...payload, company: companyId });
  await service.save();
  return service;
};

exports.update = async (id, payload) => {
  if (payload.isArchived) return Service.updateOne({ _id: id }, payload);

  return Service.updateOne({ _id: id }, { $push: { versions: payload } });
};

exports.remove = async id => Service.deleteOne({ _id: id });
