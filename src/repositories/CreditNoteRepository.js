const { ObjectID } = require('mongodb');

const CreditNote = require('../models/CreditNote');

exports.findAmountsGroupedByCustomer = async (companyId, customerId = null, dateMax = null) => {
  const rules = [];
  if (customerId) rules.push({ customer: new ObjectID(customerId) });
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const customerCreditNotesAmounts = await CreditNote.aggregate([
    { $match: rules.length === 0 ? {} : { $and: rules } },
    {
      $group: { _id: '$customer', refund: { $sum: '$inclTaxesCustomer' } },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer' } },
    {
      $project: {
        _id: { customer: '$_id', tpp: null },
        customer: { _id: 1, identity: 1, fundings: 1 },
        refund: 1,
      },
    },
  ]).option({ company: companyId });

  return customerCreditNotesAmounts;
};

exports.findAmountsGroupedByTpp = async (companyId, customerId = null, dateMax = null) => {
  const rules = [];
  if (customerId) rules.push({ customer: new ObjectID(customerId) });
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const tppCreditNotesAmounts = await CreditNote.aggregate([
    { $match: rules.length === 0 ? {} : { $and: rules } },
    {
      $group: {
        _id: { tpp: '$thirdPartyPayer', customer: '$customer' },
        refund: { $sum: '$inclTaxesTpp' },
      },
    },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: '_id.tpp',
        foreignField: '_id',
        as: 'thirdPartyPayer',
      },
    },
    { $unwind: { path: '$thirdPartyPayer' } },
    {
      $lookup: {
        from: 'customers',
        localField: '_id.customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: { path: '$customer' } },
    {
      $project: {
        _id: 1,
        thirdPartyPayer: { name: 1, _id: 1 },
        customer: { _id: 1, identity: 1, fundings: 1 },
        refund: 1,
      },
    },
  ]).option({ company: companyId });

  return tppCreditNotesAmounts;
};
