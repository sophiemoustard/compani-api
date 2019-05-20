const moment = require('moment');
const momentRange = require('moment-range');
const Event = require('../models/Event');
const Company = require('../models/Company');

momentRange.extendMoment(moment);

const getEventToPay = async rules => Event.aggregate([
  { $match: { $and: rules } },
  {
    $group: { _id: { SUBS: '$subscription', AUX: '$auxiliary', CUS: '$customer' }, events: { $push: '$$ROOT' } }
  },
  {
    $lookup: {
      from: 'users',
      localField: '_id.AUX',
      foreignField: '_id',
      as: 'auxiliary',
    },
  },
  { $unwind: { path: '$auxiliary' } },
  {
    $lookup: {
      from: 'customers',
      localField: '_id.CUS',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer' } },
  {
    $addFields: {
      sub: {
        $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$_id.SUBS'] } },
      }
    }
  },
  { $unwind: { path: '$sub' } },
  {
    $lookup: {
      from: 'services',
      localField: 'sub.service',
      foreignField: '_id',
      as: 'sub.service',
    }
  },
  { $unwind: { path: '$sub.service' } },
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
    $group: {
      _id: '$_id.AUX',
      auxiliary: { $addToSet: '$auxiliary' },
      eventsBySubscription: {
        $push: { subscription: '$sub', events: '$events' },
      }
    }
  },
  { $unwind: { path: '$auxiliary' } },
  {
    $project: {
      _id: 0,
      auxiliary: {
        _id: 1,
        identity: 1,
        sector: 1,
        contracts: 1,
        administrative: { mutualFund: 1 },
      },
      eventsBySubscription: 1,
    }
  }
]);

exports.getContractHours = (contract, query) => {
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && moment(ver.endDate).isAfter(query.startDate)) ||
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.isActive));

  let contractHours = 0;
  for (const version of versions) {
    const hoursPerDay = version.weeklyHours / 6;
    const startDate = moment(version.startDate).isBefore(query.startDate) ? moment(query.startDate) : moment(version.startDate).startOf('d');
    const endDate = version.endDate && moment(version.endDate).isBefore(query.endDate)
      ? moment(version.endDate).subtract(1, 'd').endOf('d')
      : moment(query.endDate);
    const range = Array.from(moment().range(startDate, endDate).by('days'));
    for (const day of range) {
      if (day.isoWeekday() !== 7) contractHours += hoursPerDay;
    }
  }

  return contractHours;
};

exports.getDraftPayByAuxiliary = (eventsBySubscription, auxiliary, company, query) => {
  const { _id, identity, sector, contracts } = auxiliary;

  let workedHours = 0;
  for (const group of eventsBySubscription) {
    const { events } = group;
    for (const event of events) {
      workedHours += moment(event.endDate).diff(event.startDate, 'm') / 60;
    }
  }

  return {
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    contractHours: exports.getContractHours(contracts[0], query),
    workedHours,
    mutual: !(auxiliary.administrative && auxiliary.administrative.mutualFund && auxiliary.administrative.mutualFund.has),
    otherFees: company.rhConfig && company.rhConfig.phoneSubRefunding ? company.rhConfig.phoneSubRefunding : 0,
    bonus: 0,
  };
};

exports.getDraftPay = async (rules, query) => {
  const eventsToPay = await getEventToPay(rules);
  const company = await Company.findOne({});

  const draftPay = [];
  for (const group of eventsToPay) {
    draftPay.push(exports.getDraftPayByAuxiliary(group.eventsBySubscription, group.auxiliary, company, query));
  }

  return draftPay;
};
