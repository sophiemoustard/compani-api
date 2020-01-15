const moment = require('moment');
const SectorHistory = require('../models/SectorHistory');
const { ABSENCE, COMPANY_CONTRACT } = require('../helpers/constants');

exports.getContractsAndAbsencesBySector = async (month, sectors, companyId) => {
  const minDate = moment(month, 'MMYYYY').startOf('month').toDate();
  const maxDate = moment(month, 'MMYYYY').endOf('month').toDate();

  return SectorHistory.aggregate([
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lte: maxDate },
        $or: [{ endDate: { $exists: false } }, { endDate: { $gte: minDate } }],
      },
    },
    {
      $lookup: {
        from: 'users',
        as: 'auxiliary',
        localField: 'auxiliary',
        foreignField: '_id',
      },
    },
    { $unwind: { path: '$auxiliary' } },
    { $addFields: { 'auxiliary.sector': { _id: '$sector', startDate: '$startDate', endDate: '$endDate' } } },
    { $replaceRoot: { newRoot: '$auxiliary' } },
    { $project: { _id: 1, sector: 1 } },
    {
      $lookup: {
        from: 'contracts',
        as: 'contracts',
        let: {
          auxiliaryId: '$_id',
          sectorStartDate: '$sector.startDate',
          sectorEndDate: { $ifNull: ['$sector.endDate', maxDate] },
        },
        pipeline: [
          {
            $match: {
              status: COMPANY_CONTRACT,
              startDate: { $lte: maxDate },
              $or: [
                {
                  $and: [
                    { endDate: { $exists: false } },
                    {
                      $expr: {
                        $and: [
                          { $eq: ['$user', '$$auxiliaryId'] },
                          { $lte: ['$startDate', '$$sectorEndDate'] },
                        ],
                      },
                    },
                  ],
                },
                {
                  $and: [
                    { endDate: { $exists: true, $gte: minDate } },
                    {
                      $expr: {
                        $and: [
                          { $eq: ['$user', '$$auxiliaryId'] },
                          { $lte: ['$startDate', '$$sectorEndDate'] },
                          { $gte: ['$endDate', '$$sectorStartDate'] },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
    { $unwind: { path: '$contracts' } },
    {
      $lookup: {
        from: 'events',
        as: 'contracts.absences',
        let: {
          auxiliaryId: '$_id',
          sectorStartDate: '$sector.startDate',
          sectorEndDate: { $ifNull: ['$sector.endDate', maxDate] },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$auxiliary', '$$auxiliaryId'] },
                  { $lte: ['$startDate', '$$sectorEndDate'] },
                  { $gte: ['$endDate', '$$sectorStartDate'] },
                ],
              },
              startDate: { $lte: maxDate },
              endDate: { $gte: minDate },
              type: ABSENCE,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        'contracts.absences': {
          $filter: {
            input: '$contracts.absences',
            as: 'absence',
            cond: {
              $and: [
                { $gte: ['$$absence.endDate', '$contracts.startDate'] },
                {
                  $or: [
                    { $eq: [{ $type: '$contracts.endDate' }, 'missing'] },
                    { $lte: ['$$absence.startDate', '$contracts.endDate'] },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    { $addFields: { 'contracts.sector': '$sector' } },
    { $group: { _id: '$sector._id', contracts: { $push: '$contracts' } } },
  ]).option({ company: companyId });
};

exports.getUsersBySectors = async (startDate, endDate, sectors, companyId) => SectorHistory.aggregate([
  [
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lte: endDate },
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: startDate } },
        ],
      },
    },
    { $lookup: { from: 'users', localField: 'auxiliary', foreignField: '_id', as: 'auxiliary' } },
    { $unwind: { path: '$auxiliary' } },
    { $group: { _id: '$sector', auxiliaries: { $addToSet: '$auxiliary' } } },
    { $project: { sector: '$_id', auxiliaries: { _id: 1 } } },
  ],
]).option({ company: companyId });
