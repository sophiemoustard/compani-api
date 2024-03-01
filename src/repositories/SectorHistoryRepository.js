const SectorHistory = require('../models/SectorHistory');
const { INTERVENTION, INVOICED_AND_PAID } = require('../helpers/constants');
const { CompaniDate } = require('../helpers/dates/companiDates');

exports.getUsersFromSectorHistories = async (startDate, endDate, sectors, companyId) => SectorHistory.aggregate([
  [
    {
      $match: {
        sector: { $in: sectors },
        startDate: { $lte: new Date(endDate) },
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date(startDate) } },
        ],
      },
    },
    { $lookup: { from: 'users', localField: 'auxiliary', foreignField: '_id', as: 'auxiliary' } },
    { $unwind: { path: '$auxiliary' } },
    { $group: { _id: '$auxiliary', sectors: { $addToSet: '$sector' } } },
    { $project: { auxiliaryId: '$_id._id', sectors: 1, _id: 0, identity: '$_id.identity', picture: '$_id.picture' } },
  ],
]).option({ company: companyId });

exports.getPaidInterventionStats = async (auxiliaryIds, month, companyId) => {
  const minDate = CompaniDate(month, 'MM-yyyy').startOf('month').toISO();
  const maxDate = CompaniDate(month, 'MM-yyyy').endOf('month').toISO();

  return SectorHistory.aggregate([
    {
      $match: {
        auxiliary: { $in: auxiliaryIds },
        startDate: { $lte: new Date(maxDate) },
        $or: [{ endDate: { $gte: new Date(minDate) } }, { endDate: { $exists: false } }],
      },
    },
    {
      $lookup: {
        from: 'events',
        as: 'events',
        let: {
          auxiliaryId: '$auxiliary',
          sectorStartDate: '$startDate',
          sectorEndDate: { $ifNull: ['$endDate', new Date(maxDate)] },
        },
        pipeline: [
          {
            $match: {
              type: INTERVENTION,
              startDate: { $lte: new Date(maxDate) },
              endDate: { $gte: new Date(minDate) },
              $or: [{ isCancelled: false }, { 'cancel.condition': INVOICED_AND_PAID }],
              $expr: {
                $and: [
                  { $eq: ['$auxiliary', '$$auxiliaryId'] },
                  { $gte: ['$endDate', '$$sectorStartDate'] },
                  { $lte: ['$startDate', '$$sectorEndDate'] },
                ],
              },
            },
          },
        ],
      },
    },
    { $unwind: { path: '$events' } },
    { $replaceRoot: { newRoot: '$events' } },
    { $addFields: { duration: { $divide: [{ $subtract: ['$endDate', '$startDate'] }, 60 * 60 * 1000] } } },
    {
      $group: {
        _id: { auxiliary: '$auxiliary', customer: '$customer' },
        duration: { $sum: '$duration' },
        events: { $addToSet: '$$ROOT' },
      },
    },
    {
      $group: {
        _id: { auxiliary: '$_id.auxiliary' },
        customerCount: { $sum: 1 },
        duration: { $sum: '$duration' },
      },
    },
    {
      $project: {
        _id: '$_id.auxiliary',
        customerCount: 1,
        duration: 1,
      },
    },
  ]).option({ company: companyId });
};
