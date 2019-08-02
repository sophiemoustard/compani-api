const moment = require('moment-business-days');
const momentRange = require('moment-range');
const Holidays = require('date-holidays');
const get = require('lodash/get');
const has = require('lodash/has');
const setWith = require('lodash/setWith');
const clone = require('lodash/clone');
const differenceBy = require('lodash/differenceBy');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const Pay = require('../models/Pay');
const ContractRepository = require('../repositories/ContractRepository');
const EventRepository = require('../repositories/EventRepository');
const {
  FIXED,
  PUBLIC_TRANSPORT,
  TRANSIT,
  DRIVING,
  PRIVATE_TRANSPORT,
  INTERVENTION,
  DAILY,
  COMPANY_CONTRACT,
  WEEKS_PER_MONTH,
} = require('./constants');
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
  workingWeekdays: [1, 2, 3, 4, 5, 6],
});
moment.tz.setDefault('Europe/Paris');

exports.getBusinessDaysCountBetweenTwoDates = (start, end) => {
  let count = 0;
  if (moment(end).isBefore(start)) return count;

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
    (moment(ver.startDate).isSameOrBefore(query.endDate) && ver.endDate && moment(ver.endDate).isAfter(query.startDate)) ||
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
    contractHours += version.weeklyHours * (businessDays / monthBusinessDays) * WEEKS_PER_MONTH;
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

exports.getSurchargeDetails = (surchargedHours, surcharge, surchargeKey, details) => {
  const surchargePlanId = surcharge._id.toHexString();
  const surchargedHoursPath = [surchargePlanId, surchargeKey, 'hours'];
  const currentSurchargedHours = get(details, surchargedHoursPath, 0);

  details = setWith(clone(details), surchargedHoursPath, surchargedHours + currentSurchargedHours, clone);
  details[surchargePlanId][surchargeKey].percentage = surcharge[surchargeKey];
  details[surchargePlanId].planName = surcharge.name;

  return details;
};

exports.applySurcharge = (paidHours, surcharge, surchargeKey, details, paidDistance) => ({
  surcharged: paidHours,
  notSurcharged: 0,
  details: exports.getSurchargeDetails(paidHours, surcharge, surchargeKey, details),
  paidKm: paidDistance,
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails, paidTransport) => {
  const {
    saturday, sunday, publicHoliday, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime,
  } = surcharge;

  const paidHours = (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60;
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(paidHours, surcharge, 'twentyFifthOfDecember', surchargeDetails, paidTransport.distance);
  } else if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(paidHours, surcharge, 'firstOfMay', surchargeDetails, paidTransport.distance);
  } else if (publicHoliday && publicHoliday > 0 && moment(event.startDate).startOf('d').isHoliday()) {
    return exports.applySurcharge(paidHours, surcharge, 'publicHoliday', surchargeDetails, paidTransport.distance);
  } else if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(paidHours, surcharge, 'saturday', surchargeDetails, paidTransport.distance);
  } else if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(paidHours, surcharge, 'sunday', surchargeDetails, paidTransport.distance);
  }

  let totalSurchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    const surchargedHours = exports.computeCustomSurcharge(event, eveningStartTime, eveningEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, surcharge, 'evening', details);
    totalSurchargedHours += surchargedHours;
  }
  if (custom) {
    const surchargedHours = exports.computeCustomSurcharge(event, customStartTime, customEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, surcharge, 'custom', details);
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
      : get(prevEvent, 'address.fullAddress', null);
    const destinations = event.type === INTERVENTION
      ? get(event, 'customer.contact.address.fullAddress', null)
      : get(event, 'address.fullAddress', null);
    let transportMode = null;
    if (has(event, 'auxiliary.administrative.transportInvoice.transportType')) {
      transportMode = event.auxiliary.administrative.transportInvoice.transportType === PUBLIC_TRANSPORT ? TRANSIT : DRIVING;
    }

    if (!origins || !destinations || !transportMode) return { duration: paidTransportDuration, distance: paidKm };

    const transport = await exports.getTransportInfo(distanceMatrix, origins, destinations, transportMode);
    const breakDuration = moment(event.startDate).diff(moment(prevEvent.endDate), 'minutes');
    const pickTransportDuration = (transport.duration > breakDuration) || breakDuration > (transport.duration + 15);
    paidTransportDuration = pickTransportDuration ? transport.duration : breakDuration;
    paidKm = transport.distance;
  }

  return { duration: paidTransportDuration, distance: paidKm };
};

exports.getEventHours = async (event, prevEvent, service, details, distanceMatrix) => {
  const paidTransport = await exports.getPaidTransportInfo(event, prevEvent, distanceMatrix);

  if (!service || !service.surcharge) {
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
        if (paidEvent.subscription.service.nature === FIXED) continue; // Fixed services are included manually in bonus

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
  for (const absence of absences) {
    if (absence.absenceNature === DAILY) {
      const start = moment.max(moment(absence.startDate), moment(query.startDate));
      const end = moment.min(moment(absence.endDate), moment(query.endDate));
      const range = Array.from(moment().range(start, end).by('days'));
      for (const day of range) {
        if (day.startOf('d').isBusinessDay()) { // startOf('day') is necessery to check fr holidays in business day
          const version = contract.versions.length === 1 ? contract.versions[0] : UtilsHelper.getMatchingVersion(day, contract, 'startDate');
          if (!version) continue;
          hours += version.weeklyHours / 6;
        }
      }
    } else {
      hours += moment(absence.endDate).diff(absence.startDate, 'm') / 60;
    }
  }

  return hours;
};

exports.getDraftPayByAuxiliary = async (auxiliary, events, absences, prevPay, company, query, distanceMatrix, surcharges) => {
  const { _id, identity, sector, contracts } = auxiliary;
  const contract = contracts.find((cont) => {
    const isCompanyContract = cont.status === COMPANY_CONTRACT;
    const isContractActiveOnPeriod = moment(cont.startDate).isSameOrBefore(query.endDate) &&
      ((!cont.endDate && cont.versions.some(v => v.isActive)) || (cont.endDate && moment(cont.endDate).isAfter(query.endDate)));

    return isCompanyContract && isContractActiveOnPeriod;
  });
  if (!contract) return;
  const contractInfo = exports.getContractMonthInfo(contract, query);

  const hours = await exports.getPayFromEvents(events, distanceMatrix, surcharges, query);
  const absencesHours = exports.getPayFromAbsences(absences, contract, query);

  const hoursBalance = (hours.workedHours - contractInfo.contractHours) + absencesHours;

  return {
    auxiliaryId: auxiliary._id,
    auxiliary: { _id, identity, sector },
    startDate: query.startDate,
    endDate: query.endDate,
    month: moment(query.startDate).format('MM-YYYY'),
    contractHours: contractInfo.contractHours,
    ...hours,
    hoursBalance,
    hoursCounter: prevPay ? prevPay.hoursCounter + prevPay.diff + hoursBalance : hoursBalance,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: !get(auxiliary, 'administrative.mutualFund.has'),
    transport: exports.getTransportRefund(auxiliary, company, contractInfo.workedDaysRatio, hours.paidKm),
    otherFees: (get(company, 'rhConfig.feeAmount') || 0) * contractInfo.workedDaysRatio,
    bonus: 0,
  };
};

exports.computePrevPayCounterDiff = async (auxiliary, events, absences, prevPay, query, distanceMatrix, surcharges) => {
  const contract = auxiliary.contracts.find(cont => cont.status === COMPANY_CONTRACT && (!cont.endDate || moment(cont.endDate).isAfter(query.endDate)));
  const contractInfo = exports.getContractMonthInfo(contract, query);

  const hours = await exports.getPayFromEvents(events, distanceMatrix, surcharges, query);
  const absencesHours = exports.getPayFromAbsences(absences, contract, query);

  const hoursBalance = (hours.workedHours - contractInfo.contractHours) + absencesHours;

  return {
    auxiliary: auxiliary._id,
    diff: prevPay ? hoursBalance - prevPay.hoursBalance : hoursBalance,
    hoursCounter: prevPay ? prevPay.hoursCounter : 0,
  };
};

exports.getPreviousMonthPay = async (query, surcharges, distanceMatrix) => {
  const start = moment(query.startDate).toDate();
  const end = moment(query.endDate).toDate();
  const contractRules = {
    status: COMPANY_CONTRACT,
    startDate: { $lte: end },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
  };
  const auxiliaries = await ContractRepository.getAuxiliariesFromContracts(contractRules);
  const auxIds = auxiliaries.map(aux => aux._id);
  const eventsByAuxiliary = await EventRepository.getEventsToPay(start, end, auxIds);
  const absencesByAuxiliary = await EventRepository.getAbsencesToPay(start, end, auxIds);
  const prevPayList = await Pay.find({ month: moment(query.startDate).format('MM-YYYY') });

  const prevPayDiff = [];
  for (const auxiliary of auxiliaries) {
    const auxEvents = eventsByAuxiliary.find(group => group._id.toHexString() === auxiliary._id.toHexString()) || { events: [] };
    const auxAbsences = absencesByAuxiliary.find(group => group._id.toHexString() === auxiliary._id.toHexString()) || { events: [] };
    const auxPrevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === auxiliary._id.toHexString());

    if (auxAbsences.events.length > 0 || auxEvents.events.length > 0 || auxPrevPay) {
      prevPayDiff.push(await exports.computePrevPayCounterDiff(auxiliary, auxEvents.events, auxAbsences.events, auxPrevPay, query, distanceMatrix, surcharges));
    }
  }

  return prevPayDiff;
};

exports.getDraftPay = async (query) => {
  const start = moment(query.startDate).startOf('d').toDate();
  const end = moment(query.endDate).endOf('d').toDate();
  const contractRules = {
    status: COMPANY_CONTRACT,
    startDate: { $lte: end },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
  };
  const auxiliaries = await ContractRepository.getAuxiliariesFromContracts(contractRules);
  const existingPay = await Pay.find({ month: moment(query.startDate).format('MM-YYYY') });

  const auxIds = differenceBy(auxiliaries.map(aux => aux._id), existingPay.map(pay => pay.auxiliary), x => x.toHexString());
  const eventsByAuxiliary = await EventRepository.getEventsToPay(start, end, auxIds);
  const absencesByAuxiliary = await EventRepository.getAbsencesToPay(start, end, auxIds);
  const company = await Company.findOne({}).lean();
  const surcharges = await Surcharge.find({});
  const distanceMatrix = await DistanceMatrix.find();

  const prevMonthQuery = { startDate: moment(query.startDate).subtract(1, 'M').startOf('M'), endDate: moment(query.endDate).subtract(1, 'M').endOf('M') };
  const prevPayList = await exports.getPreviousMonthPay(prevMonthQuery, surcharges, distanceMatrix);

  const draftPay = [];
  for (const id of auxIds) {
    const auxEvents = eventsByAuxiliary.find(group => group._id.toHexString() === id.toHexString()) || { events: [] };
    const auxAbsences = absencesByAuxiliary.find(group => group._id.toHexString() === id.toHexString()) || { events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === id.toHexString());
    const auxiliary = auxiliaries.find(aux => aux._id.toHexString() === id.toHexString());
    const auxiliaryDraftPay = await exports.getDraftPayByAuxiliary(auxiliary, auxEvents.events, auxAbsences.events, prevPay, company, query, distanceMatrix, surcharges);
    if (auxiliaryDraftPay) draftPay.push(auxiliaryDraftPay);
  }

  return draftPay;
};
