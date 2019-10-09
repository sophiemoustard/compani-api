const moment = require('moment');
const Contract = require('../models/Contract');
const { COMPANY_CONTRACT } = require('../helpers/constants');

exports.getAuxiliariesToPay = async (end, status) => {
  const contractRules = {
    status,
    startDate: { $lte: end },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
  };

  return Contract.aggregate([
    { $match: { ...contractRules } },
    { $group: { _id: '$user' } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'auxiliary',
      },
    },
    { $unwind: { path: '$auxiliary' } },
    {
      $lookup: {
        from: 'sectors',
        localField: 'auxiliary.sector',
        foreignField: '_id',
        as: 'auxiliary.sector',
      },
    },
    { $unwind: { path: '$auxiliary.sector' } },
    {
      $lookup: {
        from: 'contracts',
        localField: 'auxiliary.contracts',
        foreignField: '_id',
        as: 'auxiliary.contracts',
      },
    },
    {
      $project: {
        _id: 1,
        identity: { firstname: '$auxiliary.identity.firstname', lastname: '$auxiliary.identity.lastname' },
        sector: '$auxiliary.sector',
        contracts: '$auxiliary.contracts',
        contact: '$auxiliary.contact',
        administrative: { mutualFund: '$auxiliary.administrative.mutualFund', transportInvoice: '$auxiliary.administrative.transportInvoice' },
      },
    },
    {
      $lookup: {
        from: 'pays',
        as: 'pay',
        let: { auxiliaryId: '$auxiliary', month: moment(end).format('MM-YYYY') },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$auxiliary', '$$auxiliaryId'] }, { $eq: ['$month', '$$month'] }],
              },
            },
          },
        ],
      },
    },
    { $match: { pay: { $size: 0 } } },
  ]);
};

exports.getUserEndedCompanyContracts = async contractUserId => Contract.find(
  {
    user: contractUserId,
    status: COMPANY_CONTRACT,
    endDate: { $exists: true },
  },
  { endDate: 1 },
  { sort: { endDate: -1 } }
).lean();
