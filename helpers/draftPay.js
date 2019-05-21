const moment = require('moment');
const momentRange = require('moment-range');
const Holidays = require('date-holidays');
const Event = require('../models/Event');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const { getMatchingVersion } = require('../helpers/utils');
const { FIXED } = require('./constants');

momentRange.extendMoment(moment);
const holidays = new Holidays('FR');
const now = new Date();
const currentYear = now.getFullYear();
const currentHolidays = [...holidays.getHolidays(currentYear), ...holidays.getHolidays(currentYear - 1)];
moment.updateLocale('fr', {
  holidays: currentHolidays.map(holiday => holiday.date),
  holidayFormat: 'YYYY-MM-DD HH:mm:ss',
  workingWeekdays: [1, 2, 3, 4, 5, 6]
});

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

exports.populateSurcharge = async (subscription) => {
  for (let i = 0, l = subscription.service.versions.length; i < l; i++) {
    if (subscription.service.versions[i].surcharge) {
      const surcharge = await Surcharge.findOne({ _id: subscription.service.versions[i].surcharge });
      subscription.service.versions[i] = { ...subscription.service.versions[i], surcharge };
    }
  }

  return subscription;
};

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

exports.computeCustomSurcharge = (event, startHour, endHour) => {
  const start = moment(event.startDate).hour(startHour.substring(0, 2)).minute(startHour.substring(3));
  let end = moment(event.startDate).hour(endHour.substring(0, 2)).minute(endHour.substring(3));
  if (start.isAfter(end)) end = end.add(1, 'd');

  if (start.isSameOrBefore(event.startDate) && end.isSameOrAfter(event.endDate)) return moment(event.endDate).diff(moment(event.startDate), 'm') / 60;

  let inflatedTime = 0;
  if (start.isSameOrBefore(event.startDate) && end.isAfter(event.startDate) && end.isBefore(event.endDate)) {
    inflatedTime = end.diff(event.startDate, 'm');
  } else if (start.isAfter(event.startDate) && start.isBefore(event.endDate) && end.isSameOrAfter(event.endDate)) {
    inflatedTime = moment(event.endDate).diff(start, 'm');
  } else if (start.isAfter(event.startDate) && end.isBefore(event.endDate)) {
    inflatedTime = end.diff(start, 'm');
  }

  return inflatedTime / 60;
};

exports.getSurchargeDetails = (surchargeDuration, surcharge, details) => (!details[surcharge]
  ? { ...details, [surcharge]: surchargeDuration }
  : { ...details, [surcharge]: details[surcharge] + surchargeDuration }
);

exports.applySurcharge = (eventDuration, surcharge, details) => ({
  surcharged: eventDuration,
  notSurcharged: 0,
  details: exports.getSurchargeDetails(eventDuration, surcharge, details)
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails) => {
  const {
    saturday, sunday, publicHoliday, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime,
  } = surcharge;

  const eventDuration = moment(event.endDate).diff(event.startDate, 'm') / 60;
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(eventDuration, twentyFifthOfDecember, surchargeDetails);
  } else if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(eventDuration, firstOfMay, surchargeDetails);
  } else if (publicHoliday && publicHoliday > 0 && moment(moment(event.startDate).format('YYYY-MM-DD')).isHoliday()) {
    return exports.applySurcharge(eventDuration, publicHoliday, surchargeDetails);
  } else if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(eventDuration, saturday, surchargeDetails);
  } else if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(eventDuration, sunday, surchargeDetails);
  }

  let surchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    const surchargeDuration = exports.computeCustomSurcharge(event, eveningStartTime, eveningEndTime, surchargedHours);
    if (surchargeDuration) details = exports.getSurchargeDetails(surchargeDuration, evening, details);
    surchargedHours += surchargeDuration;
  }
  if (custom) {
    const surchargeDuration = exports.computeCustomSurcharge(event, customStartTime, customEndTime, surchargedHours);
    if (surchargeDuration) details = exports.getSurchargeDetails(surchargeDuration, custom, details);
    surchargedHours += surchargeDuration;
  }

  return { surcharged: surchargedHours, notSurcharged: eventDuration - surchargedHours, details };
};

exports.getEventHours = (event, service, details) => {
  // Fixed services don't have surcharge
  if (service.nature === FIXED || !service.surcharge) {
    return { surcharged: 0, notSurcharged: moment(event.endDate).diff(event.startDate, 'm') / 60, details: { ...details } };
  }

  return exports.getSurchargeSplit(event, service.surcharge, details);
};

exports.getDraftPayByAuxiliary = async (eventsBySubscription, auxiliary, company, query) => {
  const { _id, identity, sector, contracts } = auxiliary;

  let workedHours = 0;
  let notSurchargedAndNotExempt = 0;
  let surchargedAndNotExempt = 0;
  let notSurchargedAndExempt = 0;
  let surchargedAndExempt = 0;
  let surchargedAndNotExemptDetail = {};
  let surchargedAndExemptDetail = {};
  for (const group of eventsBySubscription) {
    const { events } = group;
    const subscription = await exports.populateSurcharge(group.subscription);
    for (const event of events) {
      workedHours += moment(event.endDate).diff(event.startDate, 'm') / 60;
      const serviceVersion = getMatchingVersion(event.startDate, subscription.service, 'startDate');
      if (serviceVersion.exemptFromCharges) {
        const hours = exports.getEventHours(event, serviceVersion, surchargedAndExemptDetail);
        surchargedAndExempt += hours.surcharged;
        notSurchargedAndExempt += hours.notSurcharged;
        surchargedAndExemptDetail = hours.details;
      } else {
        const hours = exports.getEventHours(event, serviceVersion, surchargedAndNotExemptDetail);
        surchargedAndNotExempt += hours.surcharged;
        notSurchargedAndNotExempt += hours.notSurcharged;
        surchargedAndNotExemptDetail = hours.details;
      }
    }
  }

  const contractHours = exports.getContractHours(contracts[0], query);

  return {
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    contractHours,
    workedHours,
    notSurchargedAndExempt,
    surchargedAndExempt,
    surchargedAndExemptDetail,
    notSurchargedAndNotExempt,
    surchargedAndNotExempt,
    surchargedAndNotExemptDetail,
    hoursBalance: workedHours - contractHours,
    hoursCounter: 0,
    overtimeHours: 0,
    additionnalHours: 0,
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
    draftPay.push(await exports.getDraftPayByAuxiliary(group.eventsBySubscription, group.auxiliary, company, query));
  }

  return draftPay;
};
