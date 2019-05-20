const moment = require('moment');
const momentRange = require('moment-range');
const Event = require('../models/Event');

momentRange.extendMoment(moment);

const getEventToPay = async rules => Event.aggregate([
  { $match: { $and: rules } },
  { $group: { _id: '$auxiliary', events: { $push: '$$ROOT' } } },
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
  { $project: { auxiliary: { _id: 1, identity: 1, sector: 1, contracts: 1 }, events: 1 } },
]);

exports.getContractHours = (contract, query) => {
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && moment(ver.endDate).isSameOrAfter(query.startDate)) ||
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.isActive));

  let contractHours = 0;
  for (const version of versions) {
    const hoursPerDay = version.weeklyHours / 6;
    const startDate = moment(version.startDate).isBefore(query.startDate) ? moment(query.startDate) : moment(version.startDate).startOf('d');
    const endDate = moment(version.endDate).isBefore(query.endDate) ? moment(version.endDate).subtract(1, 'd').endOf('d') : moment(query.endDate);
    const range = Array.from(moment().range(startDate, endDate).by('days'));
    for (const day of range) {
      if (day.isoWeekday() !== 7) contractHours += hoursPerDay;
    }
  }

  return contractHours;
};

exports.getDraftPayByAuxiliary = (events, auxiliary, query) => {
  const { _id, identity, sector, contracts } = auxiliary;

  let workedHours = 0;
  for (const event of events) {
    workedHours += moment(event.endDate).diff(event.startDate, 'm') / 60;
  }

  return {
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    contractHours: exports.getContractHours(contracts[0], query),
    workedHours,
  };
};

exports.getDraftPay = async (rules, query) => {
  const eventsToPay = await getEventToPay(rules);

  const draftPay = [];
  for (const group of eventsToPay) {
    draftPay.push(exports.getDraftPayByAuxiliary(group.events, group.auxiliary, query));
  }

  return draftPay;
};
