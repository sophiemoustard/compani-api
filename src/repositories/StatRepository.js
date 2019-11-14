const { ObjectID } = require('mongodb');
const Customer = require('../models/Customer');

exports.getFundingMonitoring = async (customerId) => {
  const res = await Customer.aggregate([
    { $match: { _id: new ObjectID(customerId) } },
  ]);
  return res;
};
