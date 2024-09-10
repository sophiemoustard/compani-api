const NumbersHelper = require('../helpers/numbers');
const CreditNote = require('../models/CreditNote');

exports.findAmountsGroupedByCustomer = async (companyId, customersIds, dateMax = null) => {
  const rules = [{ customer: { $in: customersIds } }];
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const creditNotes = await CreditNote.aggregate([
    { $match: { $and: rules } },
    { $group: { _id: '$customer', refundList: { $push: '$inclTaxesCustomer' } } },
    { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
    { $unwind: { path: '$customer' } },
    {
      $project: {
        _id: { customer: '$_id', tpp: null },
        customer: { _id: 1, identity: 1, fundings: 1 },
        refundList: 1,
      },
    },
  ]).option({ company: companyId });

  return creditNotes.map(cn => ({
    ...cn,
    refund: cn.refundList.reduce((acc, b) => NumbersHelper.add(acc, b), NumbersHelper.toString(0)),
  }));
};

exports.findAmountsGroupedByTpp = async (companyId, customersIds, dateMax = null) => {
  const rules = [{ customer: { $in: customersIds } }];
  if (dateMax) rules.push({ date: { $lt: new Date(dateMax) } });

  const tppCreditNotesAmounts = await CreditNote.aggregate([
    { $match: { $and: rules } },
    {
      $group: {
        _id: { tpp: '$thirdPartyPayer', customer: '$customer' },
        refund: { $sum: '$inclTaxesTpp' },
      },
    },
    { $lookup: { from: 'thirdpartypayers', localField: '_id.tpp', foreignField: '_id', as: 'thirdPartyPayer' } },
    { $unwind: { path: '$thirdPartyPayer' } },
    { $lookup: { from: 'customers', localField: '_id.customer', foreignField: '_id', as: 'customer' } },
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
