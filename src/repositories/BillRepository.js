const NumbersHelper = require('../helpers/numbers');
const Bill = require('../models/Bill');

exports.findAmountsGroupedByClient = async (companyId, customersIds, dateMax = null) => {
  const rules = [{ customer: { $in: customersIds } }];
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const bills = await Bill.aggregate([
    { $match: { $and: rules } },
    {
      $group: {
        _id: { tpp: { $ifNull: ['$thirdPartyPayer', null] }, customer: '$customer' },
        billedList: { $push: '$netInclTaxes' },
      },
    },
    { $lookup: { from: 'customers', localField: '_id.customer', foreignField: '_id', as: 'customer' } },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'thirdpartypayers', localField: '_id.tpp', foreignField: '_id', as: 'thirdPartyPayer' } },
    { $unwind: { path: '$thirdPartyPayer', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        customer: { _id: 1, identity: 1, payment: 1, fundings: 1 },
        thirdPartyPayer: { name: 1, _id: 1 },
        billedList: 1,
      },
    },
  ]).option({ company: companyId });

  return bills.map(bill => ({
    ...bill,
    billed: bill.billedList.reduce((acc, b) => NumbersHelper.add(acc, b), NumbersHelper.toString(0)),
  }));
};
