const User = require('../models/User');

exports.getAuxiliariesWithSectorHistory = async (userIds, companyId) => User.aggregate([
  { $match: { _id: { $in: userIds } } },
  {
    $lookup: {
      from: 'sectorhistories',
      as: 'sectorHistory',
      let: { auxiliaryId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ['$auxiliary', '$$auxiliaryId'] }, { $eq: ['$company', companyId] }],
            },
          },
        },
      ],
    },
  },
  { $unwind: { path: '$sectorHistory' } },
  { $lookup: { from: 'sectors', as: 'sectorHistory.sector', foreignField: '_id', localField: 'sectorHistory.sector' } },
  { $unwind: { path: '$sectorHistory.sector' } },
  { $group: { _id: '$_id', sectorHistory: { $push: '$sectorHistory' }, auxiliary: { $first: '$$ROOT' } } },
  { $addFields: { 'auxiliary.sectorHistory': '$sectorHistory' } },
  { $replaceRoot: { newRoot: '$auxiliary' } },
  { $project: { identity: 1, sectorHistory: 1 } },
]);
