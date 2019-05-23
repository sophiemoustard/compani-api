const moment = require('moment-business-days');
const momentRange = require('moment-range');
const Holidays = require('date-holidays');
const get = require('lodash/get');
const has = require('lodash/has');
const Event = require('../models/Event');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const { getMatchingVersion } = require('./utils');
const { FIXED, PUBLIC_TRANSPORT, TRANSIT, DRIVING } = require('./constants');
const DistanceMatrixHelper = require('./distanceMatrix');

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
    if (moment(day).isBusinessDay()) count += 1;
  }

  return count;
};

exports.getMonthBusinessDaysCount = start =>
  exports.getBusinessDaysCountBetweenTwoDates(moment(start).startOf('M').toDate(), moment(start).endOf('M'));

exports.getContractMonthInfo = (contract, query) => {
  const versions = contract.versions.filter(ver =>
    (moment(ver.startDate).isSameOrBefore(query.endDate) && moment(ver.endDate).isAfter(query.startDate)) ||
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.isActive));
  const monthBusinessDays = exports.getMonthBusinessDaysCount(query.startDate);

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

/**
 * Le temps de transport est compté dans la majoration si l'heure de début de l'évènement est majorée
 */
exports.computeCustomSurcharge = (event, startHour, endHour, paidTransportDuration) => {
  const start = moment(event.startDate).hour(startHour.substring(0, 2)).minute(startHour.substring(3));
  let end = moment(event.startDate).hour(endHour.substring(0, 2)).minute(endHour.substring(3));
  if (start.isAfter(end)) end = end.add(1, 'd');

  if (start.isSameOrBefore(event.startDate) && end.isSameOrAfter(event.endDate)) {
    return (moment(event.endDate).diff(moment(event.startDate), 'm') + paidTransportDuration) / 60;
  }

  let inflatedTime = 0;
  if (start.isSameOrBefore(event.startDate) && end.isAfter(event.startDate) && end.isBefore(event.endDate)) {
    inflatedTime = end.diff(event.startDate, 'm') + paidTransportDuration;
  } else if (start.isAfter(event.startDate) && start.isBefore(event.endDate) && end.isSameOrAfter(event.endDate)) {
    inflatedTime = moment(event.endDate).diff(start, 'm');
  } else if (start.isAfter(event.startDate) && end.isBefore(event.endDate)) {
    inflatedTime = end.diff(start, 'm');
  }

  return inflatedTime / 60;
};

exports.getSurchargeDetails = (surchargedHours, surchargePlan, surcharge, details) => {
  if (!details[surchargePlan]) return { ...details, [surchargePlan]: { [surcharge]: surchargedHours } };
  if (!details[surchargePlan][surcharge]) return { ...details, [surchargePlan]: { ...details[surchargePlan], [surcharge]: surchargedHours } };

  return {
    ...details,
    [surchargePlan]: {
      ...details[surchargePlan],
      [surcharge]: details[surchargePlan][surcharge] + surchargedHours,
    }
  };
};

exports.applySurcharge = (eventDuration, surchargePlan, surcharge, details, paidTransportDuration) => ({
  surcharged: (eventDuration + paidTransportDuration) / 60,
  notSurcharged: 0,
  details: exports.getSurchargeDetails(eventDuration / 60, surchargePlan, surcharge, details),
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails, paidTransportDuration) => {
  const {
    saturday, sunday, publicHoliday, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime, name
  } = surcharge;

  const eventDuration = (moment(event.endDate).diff(event.startDate, 'm'));
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(eventDuration, name, `25 décembre - ${twentyFifthOfDecember}%`, surchargeDetails, paidTransportDuration);
  } else if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(eventDuration, name, `1er mai - ${firstOfMay}%`, surchargeDetails, paidTransportDuration);
  } else if (publicHoliday && publicHoliday > 0 && moment(moment(event.startDate).format('YYYY-MM-DD')).isHoliday()) {
    return exports.applySurcharge(eventDuration, name, `Jours fériés - ${publicHoliday}%`, surchargeDetails, paidTransportDuration);
  } else if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(eventDuration, name, `Samedi - ${saturday}%`, surchargeDetails, paidTransportDuration);
  } else if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(eventDuration, name, `Dimanche - ${sunday}%`, surchargeDetails, paidTransportDuration);
  }

  let totalSurchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    const surchargedHours = exports.computeCustomSurcharge(event, eveningStartTime, eveningEndTime, totalSurchargedHours, paidTransportDuration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, name, `Soirée - ${evening}%`, details);
    totalSurchargedHours += surchargedHours;
  }
  if (custom) {
    const surchargedHours = exports.computeCustomSurcharge(event, customStartTime, customEndTime, totalSurchargedHours, paidTransportDuration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, name, `Personnalisée - ${custom}%`, details);
    totalSurchargedHours += surchargedHours;
  }

  return { surcharged: totalSurchargedHours, notSurcharged: (eventDuration / 60) - totalSurchargedHours, details };
};

exports.getTransportDuration = async (distances, origins, destinations, mode) => {
  if (!origins || !destinations || !mode) return 0;
  let distanceMatrix = distances.find(dm => dm.origins === origins && dm.destinations === destinations && dm.mode === mode);

  if (!distanceMatrix) {
    distanceMatrix = await DistanceMatrixHelper.getOrCreateDistanceMatrix({ origins, destinations, mode });
  }

  return distanceMatrix && distanceMatrix.duration ? Math.round(distanceMatrix.duration / 60) : 0;
};

exports.getPaidTransportDuration = async (event, prevEvent, distanceMatrix) => {
  let paidTransport = 0;
  if (prevEvent) {
    const origins = get(prevEvent, 'customer.contact.address.fullAddress', null);
    const destinations = get(event, 'customer.contact.address.fullAddress', null);
    let transportMode = null;
    if (has(event, 'auxiliary.administrative.transportInvoice.transportType', null)) {
      transportMode = event.auxiliary.administrative.transportInvoice.transportType === PUBLIC_TRANSPORT ? TRANSIT : DRIVING;
    }

    const transportDuration = await exports.getTransportDuration(distanceMatrix, origins, destinations, transportMode);
    const breakDuration = moment(event.startDate).diff(moment(prevEvent.endDate), 'minutes');
    paidTransport = breakDuration > (transportDuration + 15) ? transportDuration : breakDuration;
  }

  return paidTransport;
};

exports.getEventHours = async (event, prevEvent, service, details, distanceMatrix) => {
  const paidTransportDuration = await exports.getPaidTransportDuration(event, prevEvent, distanceMatrix);

  if (service.nature === FIXED || !service.surcharge) { // Fixed services don't have surcharge
    return {
      surcharged: 0,
      notSurcharged: (moment(event.endDate).diff(event.startDate, 'm') + paidTransportDuration) / 60,
      details: { ...details },
    };
  }

  return exports.getSurchargeSplit(event, service.surcharge, details, paidTransportDuration);
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

  // TODO : remboursement des transports en cas de voiture
  return 0;
};

exports.getPayFromEvents = async (events, distanceMatrix) => {
  let workedHours = 0;
  let notSurchargedAndNotExempt = 0;
  let surchargedAndNotExempt = 0;
  let notSurchargedAndExempt = 0;
  let surchargedAndExempt = 0;
  let surchargedAndNotExemptDetails = {};
  let surchargedAndExemptDetails = {};
  for (const eventsPerDay of events) {
    const sortedEvents = [...eventsPerDay].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    for (let i = 0, l = sortedEvents.length; i < l; i++) {
      const subscription = await exports.populateSurcharge(sortedEvents[i].subscription);
      const service = getMatchingVersion(sortedEvents[i].startDate, subscription.service, 'startDate');
      if (service.exemptFromCharges) {
        const hours = await exports.getEventHours(sortedEvents[i], (i !== 0) && sortedEvents[i - 1], service, surchargedAndExemptDetails, distanceMatrix);
        surchargedAndExempt += hours.surcharged;
        notSurchargedAndExempt += hours.notSurcharged;
        surchargedAndExemptDetails = hours.details;
        workedHours += hours.surcharged + hours.notSurcharged;
      } else {
        const hours = await exports.getEventHours(sortedEvents[i], (i !== 0) && sortedEvents[i - 1], service, surchargedAndNotExemptDetails, distanceMatrix);
        surchargedAndNotExempt += hours.surcharged;
        notSurchargedAndNotExempt += hours.notSurcharged;
        surchargedAndNotExemptDetails = hours.details;
        workedHours += hours.surcharged + hours.notSurcharged;
      }
    }
  }

  return {
    workedHours,
    notSurchargedAndNotExempt,
    surchargedAndNotExempt,
    surchargedAndNotExemptDetails,
    notSurchargedAndExempt,
    surchargedAndExempt,
    surchargedAndExemptDetails,
  };
};

exports.getDraftPayByAuxiliary = async (events, auxiliary, company, query, distanceMatrix) => {
  const { _id, identity, sector, contracts } = auxiliary;

  const hours = await exports.getPayFromEvents(events, distanceMatrix);
  const contractInfo = exports.getContractMonthInfo(contracts[0], query);

  return {
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    contractHours: contractInfo.contractHours,
    ...hours,
    hoursBalance: hours.workedHours - contractInfo.contractHours,
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
  const distanceMatrix = await DistanceMatrix.find();

  const draftPay = [];
  for (const group of eventsToPay) {
    draftPay.push(await exports.getDraftPayByAuxiliary(group.events, group.events[0][0].auxiliary, company, query, distanceMatrix));
  }

  return draftPay;
  // return eventsToPay;
};
