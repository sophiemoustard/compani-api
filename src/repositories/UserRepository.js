const moment = require('moment');
const User = require('../models/User');
const { ABSENCE, COMPANY_CONTRACT } = require('../helpers/constants');

exports.getContractsAndAbsencesBySector = async (month, sectors, companyId) => {
  const minStartDate = moment(month, 'MMYYYY').startOf('month').toDate();
  const maxStartDate = moment(month, 'MMYYYY').endOf('month').toDate();

  return User.aggregate([
    { $match: { sector: { $in: sectors } } },
    { $project: { _id: 1, sector: 1 } },
    {
      $lookup: {
        from: 'contracts',
        as: 'contracts',
        let: { auxiliaryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$user', '$$auxiliaryId'] }] },
              startDate: { $lte: maxStartDate },
              status: COMPANY_CONTRACT,
              $or: [{ endDate: { $exists: false } }, { endDate: { $gte: minStartDate } }],
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
        let: { auxiliaryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $and: [{ $eq: ['$auxiliary', '$$auxiliaryId'] }] },
              $or: [
                { startDate: { $gte: minStartDate, $lte: maxStartDate } },
                { endDate: { $gte: minStartDate, $lte: maxStartDate } },
                { startDate: { $lte: minStartDate }, endDate: { $gte: maxStartDate } },
              ],
              type: ABSENCE,
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: '$sector',
        contracts: { $push: '$contracts' },
      },
    },
  ]).option({ company: companyId });
};
