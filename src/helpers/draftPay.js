const get = require('lodash/get');
const has = require('lodash/has');
const cloneDeep = require('lodash/cloneDeep');
const mapKeys = require('lodash/mapKeys');
const omit = require('lodash/omit');
const setWith = require('lodash/setWith');
const clone = require('lodash/clone');
const moment = require('../extensions/moment');
const Company = require('../models/Company');
const DistanceMatrix = require('../models/DistanceMatrix');
const Surcharge = require('../models/Surcharge');
const ContractRepository = require('../repositories/ContractRepository');
const EventRepository = require('../repositories/EventRepository');
const {
  PUBLIC_TRANSPORT,
  TRANSIT,
  DRIVING,
  PRIVATE_TRANSPORT,
  INTERVENTION,
  DAILY,
  INTERNAL_HOUR,
  WEEKS_PER_MONTH,
} = require('./constants');
const DistanceMatrixHelper = require('./distanceMatrix');
const UtilsHelper = require('./utils');
const ContractHelper = require('./contracts');

exports.getContractMonthInfo = (contract, query) => {
  const start = moment(query.startDate).startOf('M').toDate();
  const end = moment(query.startDate).endOf('M').toDate();
  const monthBusinessDays = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);
  const versions = ContractHelper.getMatchingVersionsList(contract.versions || [], query);

  const info = ContractHelper.getContractInfo(versions, query, monthBusinessDays);

  return {
    contractHours: info.contractHours * WEEKS_PER_MONTH,
    workedDaysRatio: info.workedDaysRatio,
    holidaysHours: info.holidaysHours,
  };
};

/**
 * Le temps de transport est compté dans la majoration si l'heure de début de l'évènement est majorée
 */
exports.applyCustomSurcharge = (event, startHour, endHour, paidTransportDuration) => {
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

  const newDetails = setWith(clone(details), surchargedHoursPath, surchargedHours + currentSurchargedHours, clone);
  newDetails[surchargePlanId][surchargeKey].percentage = surcharge[surchargeKey];
  newDetails[surchargePlanId].planName = surcharge.name;

  return newDetails;
};

exports.applySurcharge = (paidHours, surcharge, surchargeKey, details, paidTransport) => ({
  surcharged: paidHours,
  notSurcharged: 0,
  details: exports.getSurchargeDetails(paidHours, surcharge, surchargeKey, details),
  paidKm: paidTransport.distance,
  paidTransportHours: paidTransport.duration / 60,
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails, paidTransport) => {
  const {
    saturday, sunday, publicHoliday, firstOfJanuary, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime,
  } = surcharge;

  const paidHours = (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60;
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(paidHours, surcharge, 'twentyFifthOfDecember', surchargeDetails, paidTransport);
  } if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(paidHours, surcharge, 'firstOfMay', surchargeDetails, paidTransport);
  } if (firstOfJanuary && firstOfJanuary > 0 && moment(event.startDate).format('DD/MM') === '01/01') {
    return exports.applySurcharge(paidHours, surcharge, 'firstOfJanuary', surchargeDetails, paidTransport);
  } if (publicHoliday && publicHoliday > 0 && moment(event.startDate).startOf('d').isHoliday()) {
    return exports.applySurcharge(paidHours, surcharge, 'publicHoliday', surchargeDetails, paidTransport);
  } if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(paidHours, surcharge, 'saturday', surchargeDetails, paidTransport);
  } if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(paidHours, surcharge, 'sunday', surchargeDetails, paidTransport);
  }

  let totalSurchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    /* eslint-disable-next-line max-len */
    const surchargedHours = exports.applyCustomSurcharge(event, eveningStartTime, eveningEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, surcharge, 'evening', details);
    totalSurchargedHours += surchargedHours;
  }
  if (custom) {
    const surchargedHours = exports.applyCustomSurcharge(event, customStartTime, customEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, surcharge, 'custom', details);
    totalSurchargedHours += surchargedHours;
  }

  return {
    surcharged: totalSurchargedHours,
    notSurcharged: paidHours - totalSurchargedHours,
    details,
    paidKm: paidTransport.distance,
    paidTransportHours: paidTransport.duration / 60,
  };
};

exports.getTransportInfo = async (distances, origins, destinations, mode, companyId) => {
  if (!origins || !destinations || !mode) return { distance: 0, duration: 0 };
  let distanceMatrix = distances.find(dm => dm.origins === origins && dm.destinations === destinations &&
    dm.mode === mode);

  if (!distanceMatrix) {
    const query = { origins, destinations, mode };
    distanceMatrix = await DistanceMatrixHelper.getOrCreateDistanceMatrix(query, companyId);
    distances.push(distanceMatrix || { ...query, distance: 0, duration: 0 });
  }

  return !distanceMatrix
    ? { distance: 0, duration: 0 }
    : { duration: distanceMatrix.duration / 60, distance: distanceMatrix.distance / 1000 };
};

exports.getTransportMode = event =>
  ({
    default: event.auxiliary.administrative.transportInvoice.transportType === PUBLIC_TRANSPORT
      ? TRANSIT
      : DRIVING,
    ...(event.transportMode && { specific: event.transportMode === PUBLIC_TRANSPORT ? TRANSIT : DRIVING }),
  });

exports.getPaidTransportInfo = async (event, prevEvent, dm) => {
  let paidTransportDuration = 0;
  let paidKm = 0;

  if (prevEvent && !prevEvent.hasFixedService && !event.hasFixedService) {
    const origins = get(prevEvent, 'address.fullAddress', null);
    const destinations = get(event, 'address.fullAddress', null);
    let transportMode = null;
    if (has(event, 'auxiliary.administrative.transportInvoice.transportType')) {
      transportMode = exports.getTransportMode(event);
    }

    if (!origins || !destinations || !transportMode) return { duration: paidTransportDuration, distance: paidKm };
    const transport = await exports.getTransportInfo(
      dm,
      origins,
      destinations,
      transportMode.specific || transportMode.default,
      event.company
    );
    const breakDuration = moment(event.startDate).diff(moment(prevEvent.endDate), 'minutes');
    const pickTransportDuration = breakDuration > (transport.duration + 15);
    paidTransportDuration = pickTransportDuration ? transport.duration : breakDuration;
    paidKm = transportMode.default === DRIVING &&
      (!transportMode.specific || transportMode.specific === PRIVATE_TRANSPORT)
      ? transport.distance
      : 0;
  }

  return { duration: paidTransportDuration, distance: paidKm };
};

exports.getEventHours = async (event, prevEvent, service, details, dm) => {
  const paidTransport = await exports.getPaidTransportInfo(event, prevEvent, dm);

  if (!service || !service.surcharge) {
    return {
      surcharged: 0,
      notSurcharged: (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60,
      details: { ...details },
      paidKm: paidTransport.distance,
      paidTransportHours: paidTransport.duration / 60,
    };
  }

  return exports.getSurchargeSplit(event, service.surcharge, details, paidTransport);
};

exports.getTransportRefund = (auxiliary, company, workedDaysRatio, paidKm) => {
  const transportType = get(auxiliary, 'administrative.transportInvoice.transportType', null);
  if (!transportType) return 0;

  if (transportType === PUBLIC_TRANSPORT) {
    if (!has(company, 'rhConfig.transportSubs')) return 0;
    if (!has(auxiliary, 'contact.address.zipCode')) return 0;
    if (!get(auxiliary, 'administrative.transportInvoice.link', null)) return 0;

    const transportSub = company.rhConfig.transportSubs
      .find(ts => ts.department === auxiliary.contact.address.zipCode.slice(0, 2));
    if (!transportSub) return 0;

    return transportSub.price * 0.5 * workedDaysRatio;
  }

  if (transportType === PRIVATE_TRANSPORT) {
    if (!has(company, 'rhConfig.amountPerKm')) return 0;

    return paidKm * company.rhConfig.amountPerKm;
  }

  return 0;
};

exports.initializePaidHours = () => cloneDeep({
  workedHours: 0,
  internalHours: 0,
  notSurchargedAndNotExempt: 0,
  surchargedAndNotExempt: 0,
  notSurchargedAndExempt: 0,
  surchargedAndExempt: 0,
  surchargedAndNotExemptDetails: {},
  surchargedAndExemptDetails: {},
  paidKm: 0,
  paidTransportHours: 0,
});

const incrementHours = (total, hours, surchargedKey) => {
  const notSurchargedKey = `not${UtilsHelper.capitalize(surchargedKey)}`;

  return {
    ...total,
    [surchargedKey]: total[surchargedKey] + hours.surcharged,
    [notSurchargedKey]: total[notSurchargedKey] + hours.notSurcharged,
    [`${surchargedKey}Details`]: hours.details,
    workedHours: total.workedHours + hours.surcharged + hours.notSurcharged,
    paidKm: total.paidKm + hours.paidKm,
    paidTransportHours: total.paidTransportHours + hours.paidTransportHours,
  };
};

exports.getPayFromEvents = async (events, auxiliary, dm, surcharges, query) => {
  let paidHours = exports.initializePaidHours();
  for (const eventsPerDay of events) {
    const sortedEvents = [...eventsPerDay].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    for (let i = 0, l = sortedEvents.length; i < l; i++) {
      const paidEvent = {
        ...sortedEvents[i],
        startDate: moment(sortedEvents[i].startDate).isSameOrAfter(query.startDate)
          ? sortedEvents[i].startDate
          : query.startDate,
        endDate: moment(sortedEvents[i].endDate).isSameOrBefore(query.endDate)
          ? sortedEvents[i].endDate
          : query.endDate,
        auxiliary,
      };

      let service = null;
      if (paidEvent.type === INTERVENTION) {
        if (paidEvent.hasFixedService) continue; // Fixed services are included manually in bonus

        service = UtilsHelper.getMatchingVersion(paidEvent.startDate, paidEvent.subscription.service, 'startDate');
        service.surcharge = service.surcharge
          ? surcharges.find(sur => sur._id.toHexString() === service.surcharge.toHexString()) || null
          : null;
      }

      const prevEvent = (i !== 0) && sortedEvents[i - 1];
      const surchargedKey = service && service.exemptFromCharges ? 'surchargedAndExempt' : 'surchargedAndNotExempt';
      const details = paidHours[`${surchargedKey}Details`];
      const hours = await exports.getEventHours(paidEvent, prevEvent, service, details, dm);
      paidHours = incrementHours(paidHours, hours, surchargedKey);
      if (paidEvent.type === INTERNAL_HOUR) paidHours.internalHours += hours.surcharged + hours.notSurcharged;
    }
  }

  return paidHours;
};

exports.getHoursFromDailyAbsence = (absence, contract, query = absence) => {
  let hours = 0;
  const start = moment.max(moment(absence.startDate).startOf('d'), moment(query.startDate), moment(contract.startDate));
  const end = contract.endDate
    ? moment.min(moment(absence.endDate), moment(query.endDate), moment(contract.endDate))
    : moment.min(moment(absence.endDate), moment(query.endDate));
  const range = Array.from(moment().range(start, end).by('days'));

  for (const day of range) {
    if (day.startOf('d').isBusinessDay()) { // startOf('day') is necessery to check fr holidays in business day
      const version = contract.versions.length === 1
        ? contract.versions[0]
        : UtilsHelper.getMatchingVersion(day, contract, 'startDate');
      if (!version) continue;
      hours += version.weeklyHours / 6;
    }
  }

  return hours;
};

exports.getPayFromAbsences = (absences, contract, query) => absences.reduce((acc, abs) => {
  if (abs.absenceNature !== DAILY) return acc + moment(abs.endDate).diff(abs.startDate, 'm') / 60;

  return acc + exports.getHoursFromDailyAbsence(abs, contract, query);
}, 0);

exports.getContract = (contracts, endDate) => contracts.find((cont) => {
  const contractStarted = moment(cont.startDate).isSameOrBefore(endDate);
  if (!contractStarted) return false;

  return !cont.endDate || moment(cont.endDate).isAfter(endDate);
});

const filterEvents = (eventsToPay, contract) => eventsToPay.events.filter((eventsPerDay) => {
  if (!eventsPerDay.length) return false;
  const firstEvent = eventsPerDay[0];

  return contract.endDate
    ? moment(firstEvent.startDate).isBetween(contract.startDate, contract.endDate, 'days', '[]')
    : moment(firstEvent.startDate).isSameOrAfter(contract.startDate);
});

const filterAbsences = (eventsToPay, contract) => eventsToPay.absences.filter((absence) => {
  const isAbsenceStartBeforeContractEnd = !contract.endDate ||
    moment(absence.startDate).isBefore(contract.endDate);
  const isAbsenceEndAfterContractStart = moment(absence.endDate).isAfter(contract.startDate);

  return isAbsenceStartBeforeContractEnd && isAbsenceEndAfterContractStart;
});

const getPhoneFees = (auxiliary, contractInfo, company) => {
  if (!get(auxiliary, 'administrative.phoneInvoice.driveId')) return 0;

  const phoneFeeAmount = get(company, 'rhConfig.phoneFeeAmount') || 0;

  return phoneFeeAmount * contractInfo.workedDaysRatio;
};

exports.computeBalance = async (auxiliary, contract, eventsToPay, company, query, distanceMatrix, surcharges) => {
  const contractInfo = exports.getContractMonthInfo(contract, query);

  const contractEvents = filterEvents(eventsToPay, contract);
  const hours = await exports.getPayFromEvents(contractEvents, auxiliary, distanceMatrix, surcharges, query);

  const contractAbsences = filterAbsences(eventsToPay, contract);
  const absencesHours = exports.getPayFromAbsences(contractAbsences, contract, query);

  const hoursToWork = Math.max(contractInfo.contractHours - contractInfo.holidaysHours - absencesHours, 0);
  const hoursBalance = hours.workedHours - hoursToWork;

  return {
    contractHours: contractInfo.contractHours,
    holidaysHours: contractInfo.holidaysHours,
    absencesHours,
    hoursToWork,
    ...hours,
    hoursBalance,
    transport: exports.getTransportRefund(auxiliary, company, contractInfo.workedDaysRatio, hours.paidKm),
    phoneFees: getPhoneFees(auxiliary, contractInfo, company),
  };
};

exports.genericData = (query, { _id, identity, sector }) => ({
  auxiliaryId: _id,
  auxiliary: { _id, identity, sector },
  overtimeHours: 0,
  additionalHours: 0,
  bonus: 0,
  endDate: query.endDate,
  month: moment(query.startDate).format('MM-YYYY'),
});

exports.computeAuxiliaryDraftPay = async (aux, contract, eventsToPay, prevPay, company, query, dm, surcharges) => {
  const monthBalance = await exports.computeBalance(aux, contract, eventsToPay, company, query, dm, surcharges);
  const hoursCounter = prevPay
    ? prevPay.hoursCounter + prevPay.diff.hoursBalance + monthBalance.hoursBalance
    : monthBalance.hoursBalance;

  return {
    ...exports.genericData(query, aux),
    startDate: moment(query.startDate).isBefore(contract.startDate) ? contract.startDate : query.startDate,
    ...monthBalance,
    hoursCounter,
    mutual: !get(aux, 'administrative.mutualFund.has'),
    diff: get(prevPay, 'diff') || exports.computeDiff(null, null, 0, 0),
    previousMonthHoursCounter: get(prevPay, 'hoursCounter') || 0,
  };
};

exports.computePrevPayDetailDiff = (prevPay, hours, detailType) => {
  const details = hours && hours[detailType] ? cloneDeep(hours[detailType]) : {};
  if (!prevPay) return details;

  const prevPayDetail = mapKeys(prevPay[detailType], value => value.planId);
  if (prevPayDetail) {
    for (const plan of Object.keys(prevPayDetail)) {
      if (prevPayDetail[plan]) {
        const surchargeKeys = Object.keys(omit(prevPayDetail[plan], ['_id', 'planId', 'planName']));
        if (!details[plan]) details[plan] = { planName: prevPayDetail[plan].planName };
        for (const surcharge of surchargeKeys) {
          if (details[plan] && details[plan][surcharge]) {
            details[plan][surcharge].hours -= prevPayDetail[plan][surcharge].hours;
          } else {
            details[plan] = {
              ...details[plan],
              [surcharge]: { ...prevPayDetail[plan][surcharge], hours: -prevPayDetail[plan][surcharge].hours },
            };
          }
        }
      }
    }
  }

  return details;
};

const getDiff = (prevPay, hours, key) => {
  const diff = (get(hours, key) || 0) - (get(prevPay, key) || 0);

  return Math.round(diff * 100) / 100;
};

exports.computeDiff = (prevPay, hours, absenceDiff, workedHoursDiff) => ({
  absencesHours: absenceDiff,
  workedHours: workedHoursDiff,
  internalHours: getDiff(prevPay, hours, 'internalHours'),
  paidTransportHours: getDiff(prevPay, hours, 'paidTransportHours'),
  notSurchargedAndNotExempt: getDiff(prevPay, hours, 'notSurchargedAndNotExempt'),
  surchargedAndNotExempt: getDiff(prevPay, hours, 'surchargedAndNotExempt'),
  surchargedAndNotExemptDetails: exports.computePrevPayDetailDiff(prevPay, hours, 'surchargedAndNotExemptDetails'),
  notSurchargedAndExempt: getDiff(prevPay, hours, 'notSurchargedAndExempt'),
  surchargedAndExempt: getDiff(prevPay, hours, 'surchargedAndExempt'),
  surchargedAndExemptDetails: exports.computePrevPayDetailDiff(prevPay, hours, 'surchargedAndExemptDetails'),
  hoursBalance: absenceDiff + workedHoursDiff,
});

exports.computePrevPayDiff = async (auxiliary, eventsToPay, prevPay, query, distanceMatrix, surcharges) => {
  const contract = auxiliary.contracts.find(cont => !cont.endDate || moment(cont.endDate).isAfter(query.endDate));
  const hours = await exports.getPayFromEvents(eventsToPay.events, auxiliary, distanceMatrix, surcharges, query);
  const absencesHours = exports.getPayFromAbsences(eventsToPay.absences, contract, query);
  const totalAbsencesHours = prevPay && prevPay.absencesHours ? absencesHours - prevPay.absencesHours : absencesHours;
  const absenceDiff = Math.round(totalAbsencesHours * 100) / 100;
  const workedHoursDiff = getDiff(prevPay, hours, 'workedHours');

  return {
    auxiliary: auxiliary._id,
    diff: exports.computeDiff(prevPay, hours, absenceDiff, workedHoursDiff),
    hoursCounter: prevPay && prevPay.hoursCounter ? prevPay.hoursCounter : 0,
  };
};

exports.getPreviousMonthPay = async (auxiliaries, query, surcharges, dm, companyId) => {
  const startDate = moment(query.startDate).subtract(1, 'M').startOf('M').toDate();
  const endDate = moment(query.endDate).subtract(1, 'M').endOf('M').toDate();
  const auxIds = auxiliaries.map(aux => aux._id);
  const eventsByAuxiliary = await EventRepository.getEventsToPay(startDate, endDate, auxIds, companyId);

  const prevPayDiff = [];
  for (const auxiliary of auxiliaries) {
    const events = eventsByAuxiliary.find(group => group.auxiliary._id.toHexString() === auxiliary._id.toHexString()) ||
      { absences: [], events: [] };
    prevPayDiff.push(
      exports.computePrevPayDiff(auxiliary, events, auxiliary.prevPay, { startDate, endDate }, dm, surcharges)
    );
  }

  return Promise.all(prevPayDiff);
};

exports.computeDraftPay = async (auxiliaries, query, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const { startDate, endDate } = query;
  const [company, surcharges, dm] = await Promise.all([
    Company.findOne({ _id: companyId }).lean(),
    Surcharge.find({ company: companyId }).lean(),
    DistanceMatrix.find({ company: companyId }).lean(),
  ]);

  const auxIds = auxiliaries.map(aux => aux._id);
  const eventsByAuxiliary = await EventRepository.getEventsToPay(startDate, endDate, auxIds, companyId);

  // Counter is reset on January
  const prevPayList = moment(query.startDate).month() === 0
    ? []
    : await exports.getPreviousMonthPay(auxiliaries, query, surcharges, dm, companyId);

  const draftPay = [];
  for (const aux of auxiliaries) {
    const events = eventsByAuxiliary.find(group => group.auxiliary._id.toHexString() === aux._id.toHexString()) ||
      { absences: [], events: [] };
    const prevPay = prevPayList.find(prev => prev.auxiliary.toHexString() === aux._id.toHexString()) || null;
    const contract = exports.getContract(aux.contracts, query.endDate);
    if (!contract) continue;

    draftPay.push(exports.computeAuxiliaryDraftPay(aux, contract, events, prevPay, company, query, dm, surcharges));
  }

  return Promise.all(draftPay);
};

exports.getDraftPay = async (query, credentials) => {
  const startDate = moment(query.startDate).startOf('d').toDate();
  const endDate = moment(query.endDate).endOf('d').toDate();

  const contractRules = {
    startDate: { $lte: endDate },
    $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: endDate } }],
  };
  const companyId = get(credentials, 'company._id', null);
  const auxiliaries = await ContractRepository.getAuxiliariesToPay(contractRules, endDate, 'pays', companyId);
  if (auxiliaries.length === 0) return [];

  return exports.computeDraftPay(auxiliaries, { startDate, endDate }, credentials);
};
