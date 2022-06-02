const moment = require('moment');
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

exports.getCreditNoteList = async (companyId) => {
  const creditNoteList = await CreditNote.aggregate([
    { $match: { thirdPartyPayer: { $exists: true } } },
    {
      $group: {
        _id: { thirdPartyPayer: '$thirdPartyPayer', year: { $year: '$date' }, month: { $month: '$date' } },
        creditNotes: { $push: '$$ROOT' },
        firstCreditNote: { $first: '$$ROOT' },
      },
    },
    {
      $addFields: {
        month: { $substr: [{ $dateToString: { date: '$firstCreditNote.date', format: '%d-%m-%Y' } }, 3, -1] },
      },
    },
    {
      $lookup: {
        from: 'billslips',
        as: 'billSlip',
        let: { thirdPartyPayerId: '$_id.thirdPartyPayer', month: '$month' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$thirdPartyPayer', '$$thirdPartyPayerId'] }, { $eq: ['$month', '$$month'] }],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$billSlip' } },
    {
      $lookup: {
        from: 'thirdpartypayers',
        localField: '_id.thirdPartyPayer',
        foreignField: '_id',
        as: 'thirdPartyPayer',
      },
    },
    { $unwind: { path: '$thirdPartyPayer' } },
    {
      $project: {
        _id: '$billSlip._id',
        creditNotes: 1,
        thirdPartyPayer: { _id: 1, name: 1 },
        month: 1,
        number: '$billSlip.number',
      },
    },
  ]).option({ company: companyId });

  return creditNoteList.map(creditNote => ({
    ...creditNote,
    netInclTaxes: creditNote.creditNotes
      .reduce((acc, cn) => NumbersHelper.add(acc, cn.inclTaxesTpp), NumbersHelper.toString(0)),
  }));
};

exports.getCreditNoteFromBillSlip = async (billSlip, companyId) => {
  const query = {
    thirdPartyPayer: billSlip.thirdPartyPayer._id,
    date: {
      $gte: moment(billSlip.month, 'MM-YYYY').startOf('month').toDate(),
      $lte: moment(billSlip.month, 'MM-YYYY').endOf('month').toDate(),
    },
    company: companyId,
  };

  return CreditNote.find(query)
    .populate({ path: 'customer', select: 'fundings identity' })
    .lean();
};
