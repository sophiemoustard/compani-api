const moment = require('moment');
const Contract = require('../models/Contract');
const { COMPANY_CONTRACT } = require('../helpers/constants');

exports.getAuxiliariesToPay = async (contractRules, end, payCollection) => Contract.aggregate([
  { $match: { ...contractRules } },
  { $group: { _id: '$user', contracts: { $push: '$$ROOT' } } },
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
    $project: {
      _id: 1,
      identity: { firstname: '$auxiliary.identity.firstname', lastname: '$auxiliary.identity.lastname' },
      sector: '$auxiliary.sector',
      contracts: '$contracts',
      contact: '$auxiliary.contact',
      administrative: { mutualFund: '$auxiliary.administrative.mutualFund', transportInvoice: '$auxiliary.administrative.transportInvoice' },
    },
  },
  {
    $lookup: {
      from: payCollection,
      as: 'pay',
      let: { auxiliaryId: '$_id', month: moment(end).format('MM-YYYY') },
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
  {
    $lookup: {
      from: 'pays',
      as: 'prevPay',
      let: { auxiliaryId: '$_id', month: moment(end).subtract(1, 'M').format('MM-YYYY') },
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
  { $unwind: { path: '$prevPay', preserveNullAndEmptyArrays: true } },
]);

exports.getUserEndedCompanyContracts = async (contractUserId, companyId) => Contract.find(
  {
    company: companyId,
    user: contractUserId,
    status: COMPANY_CONTRACT,
    endDate: { $exists: true },
  },
  { endDate: 1 },
  { sort: { endDate: -1 } }
).lean();

exports.getStaffRegister = async companyId => Contract
  .find({ company: companyId })
  .populate({
    path: 'user',
    select: 'identity administrative.idCardRecto administrative.idCardVerso administrative.residencePermitRecto administrative.residencePermitVerso',
  })
  .lean();
