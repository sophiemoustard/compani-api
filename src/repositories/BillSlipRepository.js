const Bill = require('../models/Bill');

exports.getBillsSlipList = async companyId => Bill.aggregate([
  { $match: { client: { $exists: true } } },
  {
    $group: {
      _id: { thirdPartyPayer: '$client', year: { $year: '$date' }, month: { $month: '$date' } },
      bills: { $push: '$$ROOT' },
      firstBill: { $first: '$$ROOT' },
    },
  },
  {
    $addFields: {
      netInclTaxes: {
        $reduce: {
          input: '$bills',
          initialValue: 0,
          in: { $add: ['$$value', '$$this.netInclTaxes'] },
        },
      },
      month: { $substr: [{ $dateToString: { date: '$firstBill.date', format: '%d-%m-%Y' } }, 3, -1] },
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
      netInclTaxes: 1,
      thirdPartyPayer: { _id: 1, name: 1 },
      month: 1,
      number: '$billSlip.number',
    },
  },
]).option({ company: companyId });
