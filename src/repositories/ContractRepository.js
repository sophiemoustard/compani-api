const moment = require('moment');
const Contract = require('../models/Contract');

const payLookupPipeline = (payCollection, end) => {
  const payLookup = [
    { $lookup: { from: payCollection, as: 'pays', localField: '_id', foreignField: 'auxiliary' } },
    {
      $addFields: {
        pay: {
          $filter: { input: '$pays', as: 'pay', cond: { $eq: ['$$pay.month', moment(end).format('MM-YYYY')] } },
        },
      },
    },
  ];

  if (payCollection === 'finalpays') {
    payLookup.push({ $lookup: { from: 'pays', as: 'pays', localField: '_id', foreignField: 'auxiliary' } });
  }

  return [
    ...payLookup,
    {
      $addFields: {
        prevPay: {
          $filter: {
            input: '$pays',
            as: 'pay',
            cond: { $eq: ['$$pay.month', moment(end).subtract(1, 'M').format('MM-YYYY')] },
          },
        },
      },
    },
    { $unwind: { path: '$pay', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$prevPay', preserveNullAndEmptyArrays: true } },
  ];
};

exports.getAuxiliariesToPay = async (contractRules, end, payCollection, companyId) => Contract.aggregate([
  { $match: { ...contractRules } },
  { $group: { _id: '$user', contracts: { $push: '$$ROOT' } } },
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'auxiliary' } },
  { $unwind: { path: '$auxiliary' } },
  {
    $lookup: {
      from: 'sectorhistories',
      as: 'auxiliary.sector',
      let: { auxiliaryId: '$auxiliary._id', companyId: '$auxiliary.company' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$auxiliary', '$$auxiliaryId'] },
                { $eq: ['$company', '$$companyId'] },
                { $lte: ['$startDate', end] },
              ],
            },
          },
        },
        { $sort: { startDate: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'sectors', as: 'lastSector', foreignField: '_id', localField: 'sector' } },
        { $unwind: { path: '$lastSector' } },
        { $replaceRoot: { newRoot: '$lastSector' } },
      ],
    },
  },
  { $unwind: { path: '$auxiliary.sector' } },
  ...payLookupPipeline(payCollection, end),
  { $match: { $or: [{ pay: null }, { pay: { $exists: false } }] } },
  {
    $project: {
      _id: 1,
      identity: { firstname: '$auxiliary.identity.firstname', lastname: '$auxiliary.identity.lastname' },
      sector: '$auxiliary.sector',
      contracts: '$contracts',
      contact: '$auxiliary.contact',
      administrative: {
        mutualFund: '$auxiliary.administrative.mutualFund',
        transportInvoice: '$auxiliary.administrative.transportInvoice',
      },
      prevPay: 1,
    },
  },
]).option({ company: companyId });

exports.getUserContracts = async (contractUserId, companyId) => Contract.find(
  { company: companyId, user: contractUserId },
  { endDate: 1 },
  { sort: { endDate: -1 } }
).lean();

exports.getStaffRegister = async companyId => Contract
  .find({ company: companyId })
  .populate({
    path: 'user',
    select: 'identity administrative.idCardRecto administrative.idCardVerso administrative.residencePermitRecto '
     + 'administrative.residencePermitVerso',
  })
  .lean();
