const moment = require('moment-business-days');
const momentRange = require('moment-range');
const Holidays = require('date-holidays');
const get = require('lodash/get');
const has = require('lodash/has');
const differenceBy = require('lodash/differenceBy');
const Event = require('../models/Event');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const Pay = require('../models/Pay');
const Contract = require('../models/Contract');
const { FIXED, PUBLIC_TRANSPORT, TRANSIT, DRIVING, PRIVATE_TRANSPORT, INTERVENTION, INTERNAL_HOUR, ABSENCE, DAILY, COMPANY_CONTRACT } = require('./constants');
const DistanceMatrixHelper = require('./distanceMatrix');
const UtilsHelper = require('./utils');

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
moment.tz('Europe/Paris');

exports.getAuxiliariesFromContracts = async contractRules => Contract.aggregate([
  { $match: { ...contractRules } },
  { $group: { _id: '$user' } },
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
  {
    $project: {
      _id: 1,
      auxiliary: {
        _id: 1,
        identity: { firstname: 1, lastname: 1 },
        sector: 1,
        contracts: 1,
        contact: 1,
        administrative: { mutualFund: 1, transportInvoice: 1 },
      }
    },
  },
]);

exports.getEventsToPay = async (start, end, auxiliaries) => Event.aggregate([
  {
    $match: {
      type: { $in: [INTERNAL_HOUR, INTERVENTION] },
      $or: [
        { startDate: { $gte: start, $lt: end } },
        { endDate: { $gt: start, $lte: end } },
        { endDate: { $gte: end }, startDate: { $lte: start } },
      ],
      auxiliary: { $in: auxiliaries },
      status: COMPANY_CONTRACT,
    },
  },
  {
    $lookup: {
      from: 'customers',
      localField: 'customer',
      foreignField: '_id',
      as: 'customer',
    },
  },
  { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      subscription: {
        $filter: { input: '$customer.subscriptions', as: 'sub', cond: { $eq: ['$$sub._id', '$$ROOT.subscription'] } },
      }
    }
  },
  { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'services',
      localField: 'subscription.service',
      foreignField: '_id',
      as: 'subscription.service',
    }
  },
  { $unwind: { path: '$subscription.service', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      auxiliary: 1,
      customer: { contact: 1 },
      startDate: 1,
      endDate: 1,
      subscription: { service: 1 },
      type: 1,
      location: 1,
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
      _id: '$_id.aux',
      events: { $push: '$eventsPerDay' },
    },
  },
]);

exports.getAbsencesToPay = async (start, end, auxiliaries) => Event.aggregate([
  {
    $match: {
      type: ABSENCE,
      auxiliary: { $in: auxiliaries },
      $or: [
        { startDate: { $gte: start, $lt: end } },
        { endDate: { $gt: start, $lte: end } },
        { endDate: { $gte: end }, startDate: { $lte: start } },
      ],
    }
  },
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
      startDate: 1,
      endDate: 1,
      absenceNature: 1,
    }
  },
  { $group: { _id: '$auxiliary._id', events: { $push: '$$ROOT' } } },
]);

exports.getBusinessDaysCountBetweenTwoDates = (start, end) => {
  let count = 0;
  const range = Array.from(moment().range(start, end).by('days'));
  for (const day of range) {
    if (day.startOf('d').isBusinessDay()) count += 1; // startOf('day') is necessery to check fr holidays in business day
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

exports.applySurcharge = (paidHours, surchargePlan, surcharge, details, paidDistance) => ({
  surcharged: paidHours,
  notSurcharged: 0,
  details: exports.getSurchargeDetails(paidHours, surchargePlan, surcharge, details),
  paidKm: paidDistance,
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails, paidTransport) => {
  const {
    saturday, sunday, publicHoliday, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime, name
  } = surcharge;

  const paidHours = (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60;
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(paidHours, name, `25 décembre - ${twentyFifthOfDecember}%`, surchargeDetails, paidTransport.distance);
  } else if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(paidHours, name, `1er mai - ${firstOfMay}%`, surchargeDetails, paidTransport.distance);
  } else if (publicHoliday && publicHoliday > 0 && moment(event.startDate).startOf('d').isHoliday()) {
    return exports.applySurcharge(paidHours, name, `Jours fériés - ${publicHoliday}%`, surchargeDetails, paidTransport.distance);
  } else if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(paidHours, name, `Samedi - ${saturday}%`, surchargeDetails, paidTransport.distance);
  } else if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(paidHours, name, `Dimanche - ${sunday}%`, surchargeDetails, paidTransport.distance);
  }

  let totalSurchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    const surchargedHours = exports.computeCustomSurcharge(event, eveningStartTime, eveningEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, name, `Soirée - ${evening}%`, details);
    totalSurchargedHours += surchargedHours;
  }
  if (custom) {
    const surchargedHours = exports.computeCustomSurcharge(event, customStartTime, customEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, name, `Personnalisée - ${custom}%`, details);
    totalSurchargedHours += surchargedHours;
  }

  return {
    surcharged: totalSurchargedHours,
    notSurcharged: paidHours - totalSurchargedHours,
    details,
    paidKm: paidTransport.distance,
  };
};

exports.getTransportInfo = async (distances, origins, destinations, mode) => {
  if (!origins || !destinations || !mode) return { distance: 0, duration: 0 };
  let distanceMatrix = distances.find(dm => dm.origins === origins && dm.destinations === destinations && dm.mode === mode);

  if (!distanceMatrix) {
    distanceMatrix = await DistanceMatrixHelper.getOrCreateDistanceMatrix({ origins, destinations, mode });
  }

  return !distanceMatrix ? { distance: 0, duration: 0 }
    : { duration: distanceMatrix.duration / 60, distance: distanceMatrix.distance / 1000 };
};

exports.getPaidTransportInfo = async (event, prevEvent, distanceMatrix) => {
  let paidTransportDuration = 0;
  let paidKm = 0;

  if (prevEvent) {
    const origins = prevEvent.type === INTERVENTION
      ? get(prevEvent, 'customer.contact.address.fullAddress', null)
      : get(prevEvent, 'location.fullAddress', null);
    const destinations = event.type === INTERVENTION
      ? get(event, 'customer.contact.address.fullAddress', null)
      : get(event, 'location.fullAddress', null);
    let transportMode = null;
    if (has(event, 'auxiliary.administrative.transportInvoice.transportType', null)) {
      transportMode = event.auxiliary.administrative.transportInvoice.transportType === PUBLIC_TRANSPORT ? TRANSIT : DRIVING;
    }

    const transport = await exports.getTransportInfo(distanceMatrix, origins, destinations, transportMode);
    const breakDuration = moment(event.startDate).diff(moment(prevEvent.endDate), 'minutes');
    paidTransportDuration = breakDuration > (transport.duration + 15) ? transport.duration : breakDuration;
    paidKm = transport.distance;
  }

  return { duration: paidTransportDuration, distance: paidKm };
};

exports.getEventHours = async (event, prevEvent, service, details, distanceMatrix) => {
  const paidTransport = await exports.getPaidTransportInfo(event, prevEvent, distanceMatrix);

  if (!service || service.nature === FIXED || !service.surcharge) { // Fixed services don't have surcharge
    return {
      surcharged: 0,
      notSurcharged: (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60,
      details: { ...details },
      paidKm: paidTransport.distance,
    };
  }

  return exports.getSurchargeSplit(event, service.surcharge, details, paidTransport);
};

exports.getTransportRefund = (auxiliary, company, workedDaysRatio, paidKm) => {
  if (!has(auxiliary, 'administrative.transportInvoice.transportType')) return 0;

  if (auxiliary.administrative.transportInvoice.transportType === PUBLIC_TRANSPORT) {
    if (!has(company, 'rhConfig.transportSubs')) return 0;
    if (!has(auxiliary, 'contact.address.zipCode')) return 0;

    const transportSub = company.rhConfig.transportSubs.find(ts => ts.department === auxiliary.contact.address.zipCode.slice(0, 2));
    if (!transportSub) return 0;

    return transportSub.price * 0.5 * workedDaysRatio;
  }

  if (auxiliary.administrative.transportInvoice.transportType === PRIVATE_TRANSPORT) {
    if (!has(company, 'rhConfig.amountPerKm')) return 0;

    return paidKm * company.rhConfig.amountPerKm;
  }

  return 0;
};

exports.getPayFromEvents = async (events, distanceMatrix, surcharges, query) => {
  let workedHours = 0;
  let notSurchargedAndNotExempt = 0;
  let surchargedAndNotExempt = 0;
  let notSurchargedAndExempt = 0;
  let surchargedAndExempt = 0;
  let surchargedAndNotExemptDetails = {};
  let surchargedAndExemptDetails = {};
  let paidKm = 0;
  for (const eventsPerDay of events) {
    const sortedEvents = [...eventsPerDay].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    for (let i = 0, l = sortedEvents.length; i < l; i++) {
      const paidEvent = {
        ...sortedEvents[i],
        startDate: moment(sortedEvents[i].startDate).isSameOrAfter(query.startDate) ? sortedEvents[i].startDate : query.startDate,
        endDate: moment(sortedEvents[i].endDate).isSameOrBefore(query.endDate) ? sortedEvents[i].endDate : query.endDate,
      };

      let service = null;
      if (paidEvent.type === INTERVENTION) {
        service = UtilsHelper.getMatchingVersion(paidEvent.startDate, paidEvent.subscription.service, 'startDate');
        service.surcharge = service.surcharge ? surcharges.find(sur => sur._id.toHexString() === service.surcharge.toHexString()) || null : null;
      }

      if (service && service.exemptFromCharges) {
        const hours = await exports.getEventHours(paidEvent, (i !== 0) && sortedEvents[i - 1], service, surchargedAndExemptDetails, distanceMatrix);
        surchargedAndExempt += hours.surcharged;
        notSurchargedAndExempt += hours.notSurcharged;
        surchargedAndExemptDetails = hours.details;
        workedHours += hours.surcharged + hours.notSurcharged;
        paidKm += hours.paidKm;
      } else {
        const hours = await exports.getEventHours(paidEvent, (i !== 0) && sortedEvents[i - 1], service, surchargedAndNotExemptDetails, distanceMatrix);
        surchargedAndNotExempt += hours.surcharged;
        notSurchargedAndNotExempt += hours.notSurcharged;
        surchargedAndNotExemptDetails = hours.details;
        workedHours += hours.surcharged + hours.notSurcharged;
        paidKm += hours.paidKm;
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
    paidKm,
  };
};

exports.getPayFromAbsences = (absences, contract, query) => {
  let hours = 0;
  if (absences) {
    for (const absence of absences) {
      if (absence.absenceNature === DAILY) {
        const start = moment.max(moment(absence.startDate), moment(query.startDate));
        const end = moment.min(moment(absence.endDate), moment(query.endDate));
        const range = Array.from(moment().range(start, end).by('days'));
        for (const day of range) {
          if (day.startOf('d').isBusinessDay()) {
            const version = contract.versions.length === 1 ? contract.versions[0] : UtilsHelper.getMatchingVersion(day, contract, 'startDate');
            hours += version.weeklyHours / 6;
          }
        }
      } else {
        hours += moment(absence.endDate).diff(absence.startDate, 'm') / 60;
      }
    }
  }

  return hours;
};

exports.getDraftPayByAuxiliary = async (auxiliary, events, absences, company, query, distanceMatrix, surcharges, prevPay) => {
  let hours = {
    workedHours: 0,
    notSurchargedAndNotExempt: 0,
    surchargedAndNotExempt: 0,
    notSurchargedAndExempt: 0,
    surchargedAndExempt: 0,
    surchargedAndNotExemptDetails: {},
    surchargedAndExemptDetails: {},
    paidKm: 0,
  };
  let hoursBalance = 0;

  const { _id, identity, sector, contracts } = auxiliary;
  const contract = contracts.find(cont => cont.status === COMPANY_CONTRACT && (!cont.endDate || moment(cont.endDate).isAfter(query.endDate)));
  const contractInfo = exports.getContractMonthInfo(contract, query);

  if (events.length !== 0 || absences.length !== 0) {
    hours = await exports.getPayFromEvents(events, distanceMatrix, surcharges, query);
    const absencesHours = exports.getPayFromAbsences(absences, contract, query);
    hoursBalance = (hours.workedHours - contractInfo.contractHours) + absencesHours;
  }

  return {
    auxiliaryId: auxiliary._id,
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    month: moment(query.startDate).format('MMMM'),
    contractHours: contractInfo.contractHours,
    ...hours,
    hoursBalance,
    hoursCounter: prevPay ? prevPay.hoursBalance + hoursBalance : hoursBalance,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    transport: exports.getTransportRefund(auxiliary, company, contractInfo.workedDaysRatio, hours.paidKm),
    otherFees: get(company, 'rhConfig.feeAmount', 0),
    bonus: 0,
  };
};

exports.getDraftPay = async (query) => {
  const start = moment(query.startDate).startOf('d').toDate();
  const end = moment(query.endDate).endOf('d').toDate();
  const contractRules = {
    status: COMPANY_CONTRACT,
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gte: moment(query.endDate).endOf('d').toDate() } }]
  };
  const auxiliaries = exports.getAuxiliariesFromContracts(contractRules);
  const existingPay = await Pay.find({ month: moment(query.startDate).format('MMMM') });

  const auxIds = differenceBy(auxiliaries.map(aux => aux._id), existingPay.map(pay => pay.auxiliary), x => x.toHexString());
  const eventsByAuxiliary = await exports.getEventsToPay(start, end, auxIds);
  const absencesByAuxiliary = await exports.getAbsencesToPay(start, end, auxIds);
  const company = await Company.findOne({}).lean();
  const surcharges = await Surcharge.find({});
  const distanceMatrix = await DistanceMatrix.find();
  const prevPayList = await Pay.find({ month: moment(query.startDate).subtract(1, 'M').format('MMMM') });

  const draftPay = [];
  for (const aux of auxiliaries) {
    const auxAbsences = absencesByAuxiliary.find(group => group._id.toHexString() === aux._id.toHexString()) || { events: [] };
    const auxEvents = eventsByAuxiliary.find(group => group._id.toHexString() === aux._id.toHexString()) || { events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === aux._id.toHexString());
    draftPay.push(await exports.getDraftPayByAuxiliary(aux, auxEvents.events, auxAbsences.events, company, query, distanceMatrix, surcharges, prevPay));
  }

  return draftPay;
};
