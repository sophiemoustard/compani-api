const get = require('lodash/get');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');

exports.create = async (payload, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const thirdPartyPayer = await ThirdPartyPayer.create({ ...payload, company: companyId });

  return thirdPartyPayer.toObject();
};

exports.list = async credentials => ThirdPartyPayer.find({ company: get(credentials, 'company._id') }).lean();

exports.update = async (tppId, payload) => ThirdPartyPayer
  .findOneAndUpdate({ _id: tppId }, { $set: payload }, { new: true })
  .lean();

exports.delete = async tppId => ThirdPartyPayer.deleteOne({ _id: tppId });
