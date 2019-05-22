const moment = require('moment-business-days');
const momentRange = require('moment-range');
const Holidays = require('date-holidays');
const get = require('lodash/get');
const has = require('lodash/has');
const Event = require('../models/Event');
const Company = require('../models/Company');
const Surcharge = require('../models/Surcharge');
const { getMatchingVersion } = require('../helpers/utils');
const { FIXED, PUBLIC_TRANSPORT } = require('./constants');

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
    $lookup: {
      from: 'users',
      localField: 'auxiliary',
      foreignField: '_id',
      as: 'auxiliary',
    },
  },
  { $unwind: { path: '$auxiliary' } },
  {
    $lookup: {
      from: 'customers',
      localField: 'customer',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer' } }, // WARNING heures internes
  {
    $addFields: {
      subscription: {
        $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$$ROOT.subscription'] } },
      }
    }
  },
  { $unwind: { path: '$subscription' } }, // WARNING heures internes
  {
    $lookup: {
      from: 'services',
      localField: 'subscription.service',
      foreignField: '_id',
      as: 'subscription.service',
    }
  },
  { $unwind: { path: '$subscription.service' } }, // WARNING heures internes
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
      auxiliary: {
        _id: 1,
        identity: { firstname: 1, lastname: 1 },
        sector: 1,
        contracts: 1,
        contact: 1,
        administrative: { mutualFund: 1, transportInvoice: 1 },
      },
      customer: { contact: 1 },
      startDate: 1,
      endDate: 1,
      subscription: { service: 1 },
    }
  },
  {
    $group: {
      _id: {
        aux: '$auxiliary',
        year: { $year: '$startDate' },
        month: { $month: '$startDate' },
        week: { $week: '$startDate' },
        day: { $dayOfWeek: '$startDate' }
      },
      eventsPerDay: { $push: '$$ROOT' },
      auxiliary: { $addToSet: '$auxiliary' },
    },
  },
  { $unwind: { path: '$auxiliary' } },
  {
    $group: {
      _id: '$_id.aux._id',
      events: { $push: '$eventsPerDay' },
      auxiliary: { $addToSet: '$auxiliary' },
    },
  },
  { $unwind: { path: '$auxiliary' } },
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

exports.getBusinessDaysCountBetweenTwoDates = (start, end) => {
  let count = 0;
  const range = Array.from(moment().range(start, end).by('days'));
  for (const day of range) {
    if (moment(day.format('YYYY-MM-DD')).isBusinessDay()) count += 1;
  }

  return count;
};

exports.getMontBusinessDaysCount = start =>
  exports.getBusinessDaysCountBetweenTwoDates(moment(start).startOf('M').toDate(), moment(start).endOf('M'));

exports.getContractMonthInfo = (contract, query) => {
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && moment(ver.endDate).isAfter(query.startDate)) ||
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.isActive));
  const monthBusinessDays = exports.getMontBusinessDaysCount(query.startDate);

  let contractHours = 0;
  let workedDays = 0;
  for (const version of versions) {
    const startDate = moment(version.startDate).isBefore(query.startDate) ? moment(query.startDate) : moment(version.startDate).startOf('d');
    const endDate = version.endDate && moment(version.endDate).isBefore(query.endDate)
      ? moment(version.endDate).subtract(1, 'd').endOf('d')
      : moment(query.endDate);
    const businessDays = exports.getBusinessDaysCountBetweenTwoDates(startDate, endDate);
    workedDays += businessDays;
    contractHours += version.weeklyHours * (businessDays / monthBusinessDays) * 4.33;
  }

  return { contractHours, workedDaysRatio: workedDays / monthBusinessDays };
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

exports.getSurchargeDetails = (surchargeDuration, surchargePlan, surcharge, details) => {
  if (!details[surchargePlan]) return { ...details, [surchargePlan]: { [surcharge]: surchargeDuration } };
  if (!details[surchargePlan][surcharge]) return { ...details, [surchargePlan]: { ...details[surchargePlan], [surcharge]: surchargeDuration } };

  return {
    ...details,
    [surchargePlan]: {
      ...details[surchargePlan],
      [surcharge]: details[surchargePlan][surcharge] + surchargeDuration
    }
  };
};

exports.applySurcharge = (eventDuration, surchargePlan, surcharge, details) => ({
  surcharged: eventDuration,
  notSurcharged: 0,
  details: exports.getSurchargeDetails(eventDuration, surchargePlan, surcharge, details)
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails) => {
  const {
    saturday, sunday, publicHoliday, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime, name
  } = surcharge;

  const eventDuration = moment(event.endDate).diff(event.startDate, 'm') / 60;
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(eventDuration, name, `25 décembre - ${twentyFifthOfDecember}%`, surchargeDetails);
  } else if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(eventDuration, name, `1er mai - ${firstOfMay}%`, surchargeDetails);
  } else if (publicHoliday && publicHoliday > 0 && moment(moment(event.startDate).format('YYYY-MM-DD')).isHoliday()) {
    return exports.applySurcharge(eventDuration, name, `Jours fériés - ${publicHoliday}%`, surchargeDetails);
  } else if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(eventDuration, name, `Samedi - ${saturday}%`, surchargeDetails);
  } else if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(eventDuration, name, `Dimanche - ${sunday}%`, surchargeDetails);
  }

  let surchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    const surchargeDuration = exports.computeCustomSurcharge(event, eveningStartTime, eveningEndTime, surchargedHours);
    if (surchargeDuration) details = exports.getSurchargeDetails(surchargeDuration, name, `Soirée - ${evening}%`, details);
    surchargedHours += surchargeDuration;
  }
  if (custom) {
    const surchargeDuration = exports.computeCustomSurcharge(event, customStartTime, customEndTime, surchargedHours);
    if (surchargeDuration) details = exports.getSurchargeDetails(surchargeDuration, name, `Personnalisée - ${custom}%`, details);
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

exports.getTransportRefund = (auxiliary, company, workedDaysRatio) => {
  if (!has(auxiliary, 'administrative.transportInvoice.transportType')) return 0;

  if (auxiliary.administrative.transportInvoice.transportType === PUBLIC_TRANSPORT) {
    if (!has(company, 'rhConfig.transportSubs')) return 0;
    if (!has(auxiliary, 'contact.address.zipCode')) return 0;

    const transportSub = company.rhConfig.transportSubs.find(ts => ts.department === auxiliary.contact.address.zipCode.slice(0, 2));
    if (!transportSub) return 0;

    return transportSub.price * 0.5 * workedDaysRatio;
  }

  // TODO : remboursement des transport en cas de voiture
  return 0;
};

exports.getDraftPayByAuxiliary = async (events, auxiliary, company, query) => {
  const { _id, identity, sector, contracts } = auxiliary;

  let workedHours = 0;
  let notSurchargedAndNotExempt = 0;
  let surchargedAndNotExempt = 0;
  let notSurchargedAndExempt = 0;
  let surchargedAndExempt = 0;
  let surchargedAndNotExemptDetails = {};
  let surchargedAndExemptDetails = {};
  for (const eventsPerDay of events) {
    for (const event of eventsPerDay) {
      const subscription = await exports.populateSurcharge(event.subscription);
      workedHours += moment(event.endDate).diff(event.startDate, 'm') / 60;
      const serviceVersion = getMatchingVersion(event.startDate, subscription.service, 'startDate');
      if (serviceVersion.exemptFromCharges) {
        const hours = exports.getEventHours(event, serviceVersion, surchargedAndExemptDetails);
        surchargedAndExempt += hours.surcharged;
        notSurchargedAndExempt += hours.notSurcharged;
        surchargedAndExemptDetails = hours.details;
      } else {
        const hours = exports.getEventHours(event, serviceVersion, surchargedAndNotExemptDetails);
        surchargedAndNotExempt += hours.surcharged;
        notSurchargedAndNotExempt += hours.notSurcharged;
        surchargedAndNotExemptDetails = hours.details;
      }
    }
  }

  const contractInfo = exports.getContractMonthInfo(contracts[0], query);

  return {
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    contractHours: contractInfo.contractHours,
    workedHours,
    notSurchargedAndExempt,
    surchargedAndExempt,
    surchargedAndExemptDetails,
    notSurchargedAndNotExempt,
    surchargedAndNotExempt,
    surchargedAndNotExemptDetails,
    hoursBalance: workedHours - contractInfo.contractHours,
    hoursCounter: 0,
    overtimeHours: 0,
    additionnalHours: 0,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    transport: exports.getTransportRefund(auxiliary, company, contractInfo.workedDaysRatio),
    otherFees: get(company, 'rhConfig.phoneSubRefunding', 0),
    bonus: 0,
  };
};

exports.getDraftPay = async (rules, query) => {
  const eventsToPay = await getEventToPay(rules);
  const company = await Company.findOne({}).lean();

  const draftPay = [];
  for (const group of eventsToPay) {
    draftPay.push(await exports.getDraftPayByAuxiliary(group.events, group.events[0][0].auxiliary, company, query));
  }

  return draftPay;
  // return eventsToPay;
};
