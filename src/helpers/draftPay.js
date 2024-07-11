const get = require('lodash/get');
const has = require('lodash/has');
const moment = require('../extensions/moment');
const {
  PUBLIC_TRANSPORT,
  TRANSIT,
  DRIVING,
  PRIVATE_TRANSPORT,
  HOURLY,
  HALF_DAILY,
} = require('./constants');
const DistanceMatrixHelper = require('./distanceMatrix');
const UtilsHelper = require('./utils');
const { CompaniDate } = require('./dates/companiDates');

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
