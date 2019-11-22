const moment = require('moment-timezone');
const _ = require('lodash');
const Intl = require('intl');
const { CIVILITY_LIST } = require('./constants');

exports.clean = (obj) => {
  for (const k in obj) {
    if (obj[k] === undefined || obj[k] === '' ||
      (typeof obj[k] === 'object' && Object.keys(obj[k].length === 0)) ||
      (Array.isArray(obj[k]) && obj[k].length === 0)) {
      delete obj[k];
    }
  }

  return obj;
};

exports.getLastVersion = (versions, dateKey) => {
  if (!Array.isArray(versions)) throw new Error('versions must be an array !');
  if (typeof dateKey !== 'string') throw new Error('sortKey must be a string !');
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];
  return [...versions].sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))[0];
};

exports.mergeLastVersionWithBaseObject = (baseObj, dateKey) => {
  const lastVersion = exports.getLastVersion(baseObj.versions, dateKey);
  if (!lastVersion) throw new Error('Unable to find last version from base object !');
  return { ...lastVersion, ..._.omit(baseObj, ['versions', 'createdAt']) };
};

// `obj` should by sort in descending order
exports.getMatchingVersion = (date, obj, dateKey) => {
  if (!Array.isArray(obj.versions)) throw new Error('versions must be an array !');
  if (obj.versions.length === 0) return null;

  const matchingVersion = [...obj.versions]
    .filter(ver => moment(ver.startDate).isSameOrBefore(date, 'd') && (!ver.endDate || moment(ver.endDate).isSameOrAfter(date, 'd')))
    .sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))[0];
  if (!matchingVersion) return null;

  return { ..._.omit(obj, 'versions'), ..._.omit(matchingVersion, ['_id', 'createdAt']), versionId: matchingVersion._id };
};

exports.getDateQuery = (dates) => {
  if (dates.startDate && dates.endDate) return { $lte: moment(dates.endDate).endOf('day').toISOString(), $gte: moment(dates.startDate).startOf('day').toISOString() };
  if (dates.startDate) return { $gte: dates.startDate };
  return { $lt: dates.endDate };
};

exports.getFixedNumber = (number, toFixedNb) => {
  if (Number.isNaN(Number(number))) throw new Error('You must provide a number !');
  return number.toFixed(toFixedNb);
};

exports.removeSpaces = (str) => {
  if (!str) return '';
  if (typeof str !== 'string') throw new Error('Parameter must be a string !');
  return str.split(' ').join('');
};

const roundFrenchNumber = (number) => {
  const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, style: 'currency', currency: 'EUR', currencyDisplay: 'symbol' });
  return nf.format(number);
};

exports.formatPrice = val => (val ? roundFrenchNumber(val) : roundFrenchNumber(0));

exports.getFullTitleFromIdentity = (identity) => {
  if (!identity) return '';

  const lastname = identity.lastname || '';
  let fullTitle = [
    CIVILITY_LIST[identity.title] || '',
    identity.firstname || '',
    lastname.toUpperCase(),
  ];

  fullTitle = fullTitle.filter(value => !_.isEmpty(value));

  return fullTitle.join(' ');
};

exports.formatFloatForExport = (number) => {
  if (number == null || Number.isNaN(number)) return '';
  return number.toFixed(2).replace('.', ',');
};

exports.formatArrayOrStringQueryParam = (param, keyName) =>
  (Array.isArray(param) ? param.map(id => ({ [keyName]: id })) : [{ [keyName]: param }]);

exports.capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

exports.getBusinessDaysCountBetweenTwoDates = (start, end) => {
  let holidays = 0;
  let sundays = 0;
  let businessDays = 0;
  if (moment(end).isBefore(start)) return { holidays, sundays, businessDays };

  const range = Array.from(moment().range(start, end).by('days'));
  for (const day of range) {
    if (day.startOf('d').isHoliday()) holidays += 1; // startOf('day') is necessery to check fr holidays in business day
    else if (day.day() !== 0) businessDays += 1;
    else sundays += 1;
  }

  return { holidays, sundays, businessDays };
};
