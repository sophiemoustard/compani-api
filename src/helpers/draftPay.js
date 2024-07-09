const get = require('lodash/get');
const has = require('lodash/has');
const cloneDeep = require('lodash/cloneDeep');
const setWith = require('lodash/setWith');
const clone = require('lodash/clone');
const pick = require('lodash/pick');
const { keyBy } = require('lodash');
const moment = require('../extensions/moment');
const Customer = require('../models/Customer');
const {
  PUBLIC_TRANSPORT,
  TRANSIT,
  DRIVING,
  PRIVATE_TRANSPORT,
  INTERVENTION,
  INTERNAL_HOUR,
  WEEKS_PER_MONTH,
  HOURLY,
  HALF_DAILY,
  FIXED,
} = require('./constants');
const DistanceMatrixHelper = require('./distanceMatrix');
const UtilsHelper = require('./utils');
const ContractHelper = require('./contracts');
const DatesHelper = require('./dates');
const { CompaniDate } = require('./dates/companiDates');

exports.getContractMonthInfo = (contract, query, shouldPayHolidays) => {
  const start = moment(query.startDate).startOf('M').toDate();
  const end = moment(query.startDate).endOf('M').toDate();
  const monthBusinessDays = UtilsHelper.getDaysRatioBetweenTwoDates(start, end, shouldPayHolidays);
  const versions = ContractHelper.getMatchingVersionsList(contract.versions || [], query);

  const info = ContractHelper.getContractInfo(versions, query, monthBusinessDays, shouldPayHolidays);

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

exports.applySurcharge = (paidHours, surcharge, surchargeKey, details) => ({
  surcharged: paidHours,
  details: exports.getSurchargeDetails(paidHours, surcharge, surchargeKey, details),
});

exports.getSurchargeSplit = (event, surcharge, surchargeDetails, paidTransport) => {
  const {
    saturday, sunday, publicHoliday, firstOfJanuary, firstOfMay, twentyFifthOfDecember, evening,
    eveningEndTime, eveningStartTime, custom, customStartTime, customEndTime,
  } = surcharge;

  const paidHours = (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60;
  if (twentyFifthOfDecember && twentyFifthOfDecember > 0 && moment(event.startDate).format('DD/MM') === '25/12') {
    return exports.applySurcharge(paidHours, surcharge, 'twentyFifthOfDecember', surchargeDetails);
  } if (firstOfMay && firstOfMay > 0 && moment(event.startDate).format('DD/MM') === '01/05') {
    return exports.applySurcharge(paidHours, surcharge, 'firstOfMay', surchargeDetails);
  } if (firstOfJanuary && firstOfJanuary > 0 && moment(event.startDate).format('DD/MM') === '01/01') {
    return exports.applySurcharge(paidHours, surcharge, 'firstOfJanuary', surchargeDetails);
  } if (publicHoliday && publicHoliday > 0 && moment(event.startDate).startOf('d').isHoliday()) {
    return exports.applySurcharge(paidHours, surcharge, 'publicHoliday', surchargeDetails);
  } if (saturday && saturday > 0 && moment(event.startDate).isoWeekday() === 6) {
    return exports.applySurcharge(paidHours, surcharge, 'saturday', surchargeDetails);
  } if (sunday && sunday > 0 && moment(event.startDate).isoWeekday() === 7) {
    return exports.applySurcharge(paidHours, surcharge, 'sunday', surchargeDetails);
  }

  let totalSurchargedHours = 0;
  let details = { ...surchargeDetails };
  if (evening) {
    const surchargedHours =
      exports.applyCustomSurcharge(event, eveningStartTime, eveningEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, surcharge, 'evening', details);
    totalSurchargedHours += surchargedHours;
  }
  if (custom) {
    const surchargedHours = exports.applyCustomSurcharge(event, customStartTime, customEndTime, paidTransport.duration);
    if (surchargedHours) details = exports.getSurchargeDetails(surchargedHours, surcharge, 'custom', details);
    totalSurchargedHours += surchargedHours;
  }

  return { surcharged: totalSurchargedHours, notSurcharged: paidHours - totalSurchargedHours, details };
};

exports.getTransportInfo = async (distances, origins, destinations, mode, companyId) => {
  if (!origins || !destinations || !mode) return { distance: 0, duration: 0 };
  let distanceMatrix = distances.find(dm => dm.origins === origins && dm.destinations === destinations &&
    dm.mode === mode);

  if (!distanceMatrix) {
    const query = { origins, destinations, mode };
    distanceMatrix = await DistanceMatrixHelper.createDistanceMatrix(query, companyId);
    distances.push(distanceMatrix || { ...query, distance: 0, duration: 0 });
  }

  return !distanceMatrix
    ? { distance: 0, duration: 0 }
    : { duration: distanceMatrix.duration / 60, distance: distanceMatrix.distance / 1000 };
};

exports.getTransportMode = (event) => {
  const defaultMode = get(event, 'auxiliary.administrative.transportInvoice.transportType') === PUBLIC_TRANSPORT
    ? TRANSIT
    : DRIVING;

  let specificMode;
  if (event.transportMode) specificMode = event.transportMode === PUBLIC_TRANSPORT ? TRANSIT : DRIVING;

  const shouldPayKm = defaultMode === DRIVING && (!specificMode || event.transportMode === PRIVATE_TRANSPORT);

  return { default: defaultMode, specific: specificMode, shouldPayKm };
};

exports.getPaidTransportInfo = async (event, prevEvent, dm) => {
  if (!prevEvent || prevEvent.hasFixedService || event.hasFixedService) {
    return {
      duration: 0,
      paidKm: 0,
      travelledKm: 0,
      origins: null,
      destinations: null,
      transportDuration: 0,
      breakDuration: 0,
      pickTransportDuration: false,
    };
  }

  const origins = get(prevEvent, 'address.fullAddress');
  const destinations = get(event, 'address.fullAddress');

  const transportMode = has(event, 'auxiliary.administrative.transportInvoice.transportType')
    ? exports.getTransportMode(event)
    : null;

  if (!origins || !destinations || !transportMode) return { duration: 0, paidKm: 0, travelledKm: 0 };

  const transport = await exports.getTransportInfo(
    dm,
    origins,
    destinations,
    transportMode.specific || transportMode.default,
    event.company
  );
  const breakDuration = CompaniDate(event.startDate).oldDiff(prevEvent.endDate, 'minutes').minutes;
  const pickTransportDuration = breakDuration > (transport.duration + 15);

  return {
    origins,
    destinations,
    breakDuration,
    pickTransportDuration,
    duration: pickTransportDuration ? transport.duration : Math.max(breakDuration, 0),
    transportDuration: transport.duration,
    paidKm: transportMode.shouldPayKm ? transport.distance : 0,
    travelledKm: transport.distance,
  };
};

exports.getEventHours = async (event, prevEvent, service, details, dm) => {
  const paidTransport = await exports.getPaidTransportInfo(event, prevEvent, dm);

  const eventHours = {
    ...pick(paidTransport, ['paidKm', 'travelledKm']),
    surcharged: 0,
    notSurcharged: 0,
    paidTransportHours: paidTransport.duration / 60,
    details: { ...details },
  };

  if (!get(service, 'surcharge')) {
    return {
      ...eventHours,
      notSurcharged: (moment(event.endDate).diff(event.startDate, 'm') + paidTransport.duration) / 60,
    };
  }

  return { ...eventHours, ...exports.getSurchargeSplit(event, service.surcharge, details, paidTransport) };
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
  travelledKm: 0,
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
    travelledKm: total.travelledKm + hours.travelledKm,
    paidTransportHours: total.paidTransportHours + hours.paidTransportHours,
  };
};

exports.getPayFromEvents = async (events, auxiliary, subscriptions, dm, surcharges, query) => {
  let paidHours = exports.initializePaidHours();
  for (const eventsPerDay of events) {
    const sortedEvents = [...eventsPerDay].sort(DatesHelper.ascendingSort('startDate'));
    for (let i = 0, l = sortedEvents.length; i < l; i++) {
      const subscription = subscriptions[sortedEvents[i].subscription];
      const paidEvent = {
        ...sortedEvents[i],
        startDate: moment(sortedEvents[i].startDate).isSameOrAfter(query.startDate)
          ? sortedEvents[i].startDate
          : query.startDate,
        endDate: moment(sortedEvents[i].endDate).isSameOrBefore(query.endDate)
          ? sortedEvents[i].endDate
          : query.endDate,
        auxiliary,
        ...(sortedEvents[i].type === INTERVENTION && { hasFixedService: subscription.service.nature === FIXED }),
      };

      let service = null;
      if (paidEvent.type === INTERVENTION) {
        if (paidEvent.hasFixedService) continue; // Fixed services are included manually in bonus

        service = UtilsHelper.getMatchingVersion(paidEvent.startDate, subscription.service, 'startDate');
        service.surcharge = service.surcharge
          ? surcharges.find(sur => UtilsHelper.areObjectIdsEquals(sur._id, service.surcharge)) || null
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

exports.getAbsenceHours = (absence, contracts, query = absence) => {
  if (absence.absenceNature === HOURLY) {
    const absenceDuration = CompaniDate(absence.endDate).oldDiff(absence.startDate, 'minutes');
    return absenceDuration.minutes / 60;
  }

  const dailyAbsenceHours = contracts
    .filter(c => CompaniDate(c.startDate).isSameOrBefore(absence.endDate) &&
      (!c.endDate || CompaniDate(c.endDate).isAfter(absence.startDate)))
    .reduce((acc, c) => acc + this.getHoursFromDailyAbsence(absence, c, query), 0);

  return absence.absenceNature === HALF_DAILY ? dailyAbsenceHours / 2 : dailyAbsenceHours;
};

exports.getPayFromAbsences = (absences, contract, query) => absences
  .reduce((acc, abs) => acc + exports.getAbsenceHours(abs, [contract], query), 0);

exports.getSubscriptionsForPay = async (companyId) => {
  const customers = await Customer
    .find(
      { subscriptions: { $exists: true }, company: companyId },
      { 'subscriptions.service': 1, 'subscriptions._id': 1 }
    )
    .populate({ path: 'subscriptions.service' })
    .lean();

  return keyBy(customers.flatMap(cus => cus.subscriptions), '_id');
};
