const omit = require('lodash/omit');
const isEmpty = require('lodash/isEmpty');
const { ObjectID } = require('mongodb');
const Intl = require('intl');
const moment = require('../extensions/moment');
const { CIVILITY_LIST } = require('./constants');
const DatesHelper = require('./dates');
const NumbersHelper = require('./numbers');

exports.getLastVersion = (versions, dateKey) => {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];
  return [...versions].sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))[0];
};

exports.mergeLastVersionWithBaseObject = (baseObj, dateKey) => {
  const lastVersion = exports.getLastVersion(baseObj.versions, dateKey);
  if (!lastVersion) throw new Error('Unable to find last version from base object !');

  return { ...lastVersion, ...omit(baseObj, ['versions', 'createdAt']) };
};

// `obj` should by sort in descending order
exports.getMatchingVersion = (date, obj, dateKey) => {
  if (obj.versions.length === 0) return null;

  const matchingVersion = [...obj.versions]
    .filter(ver => DatesHelper.isSameOrBefore(ver.startDate, date, 'd') &&
      (!ver.endDate || DatesHelper.isSameOrAfter(ver.endDate, date, 'd')))
    .sort(DatesHelper.descendingSort(dateKey))[0];
  if (!matchingVersion) return null;

  return {
    ...omit(obj, 'versions'),
    ...omit(matchingVersion, ['_id', 'createdAt']),
    versionId: matchingVersion._id,
  };
};

exports.getMatchingObject = (date, list, dateKey) => {
  if (list.length === 0) return null;

  const filteredAndSortedList = list
    .filter(h => DatesHelper.isSameOrBefore(h.startDate, date, 'd') &&
      (!h.endDate || DatesHelper.isSameOrAfter(h.endDate, date, 'd')))
    .sort(DatesHelper.descendingSort(dateKey));
  if (!filteredAndSortedList.length) return null;

  return filteredAndSortedList[0];
};

exports.getDateQuery = (dates) => {
  if (dates.startDate && dates.endDate) {
    return {
      $lte: moment(dates.endDate).endOf('day').toISOString(),
      $gte: moment(dates.startDate).startOf('day').toISOString(),
    };
  }

  if (dates.startDate) return { $gte: dates.startDate };

  return { $lt: dates.endDate };
};

exports.getFixedNumber = (number, toFixedNb) =>
  (Math.round(number * (10 ** toFixedNb)) / (10 ** toFixedNb)).toFixed(toFixedNb);

exports.removeSpaces = str => (str ? str.split(' ').join('') : '');

const roundFrenchPrice = (number) => {
  const nf = new Intl.NumberFormat(
    'fr-FR',
    { minimumFractionDigits: 2, style: 'currency', currency: 'EUR', currencyDisplay: 'symbol' }
  );
  return nf.format(number);
};

exports.formatPrice = val => (val ? roundFrenchPrice(val) : roundFrenchPrice(0));

const roundFrenchNumber = (number) => {
  const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, style: 'decimal' });
  return nf.format(number);
};

exports.formatHour = val => (val ? `${roundFrenchNumber(val)}h` : `${roundFrenchNumber(0)}h`);

exports.formatHourWithMinutes = hour => (moment(hour).minutes()
  ? moment(hour).format('HH[h]mm')
  : moment(hour).format('HH[h]'));

const roundFrenchPercentage = (number) => {
  const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, style: 'percent' });
  return nf.format(number);
};

exports.formatPercentage = val => (val ? roundFrenchPercentage(val) : roundFrenchPercentage(0));

exports.getFullTitleFromIdentity = (identity) => {
  if (!identity) return '';

  const lastname = identity.lastname || '';
  let fullTitle = [
    CIVILITY_LIST[identity.title] || '',
    identity.firstname || '',
    lastname.toUpperCase(),
  ];

  fullTitle = fullTitle.filter(value => !isEmpty(value));

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

exports.getDaysRatioBetweenTwoDates = (start, end) => {
  let holidays = 0;
  let sundays = 0;
  let businessDays = 0;
  if (moment(end).isBefore(start)) return { holidays, sundays, businessDays };

  const range = Array.from(moment().range(start, end).by('days'));
  for (const day of range) {
    // startOf('day') is necessery to check fr holidays in business day
    if (day.startOf('d').isHoliday() && day.day() !== 0) holidays += 1;
    else if (day.day() !== 0) businessDays += 1;
    else sundays += 1;
  }

  return { holidays, sundays, businessDays };
};

exports.formatIdentity = (identity, format) => {
  if (!identity) return '';
  const formatLower = format.toLowerCase();
  const values = [];

  for (let i = 0; i < format.length; i++) {
    let value;
    if (formatLower[i] === 'f') value = (identity.firstname || '').trim();
    else if (formatLower[i] === 'l') value = (identity.lastname || '').trim().toUpperCase();
    else if (formatLower[i] === 't') value = (CIVILITY_LIST[identity.title] || '').trim();

    if (!value) continue;

    if (formatLower[i] === format[i]) value = `${value.charAt(0).toUpperCase()}.`;
    values.push(value);
  }

  return values.join(' ');
};

exports.formatObjectIdsArray = ids => (Array.isArray(ids) ? ids.map(id => new ObjectID(id)) : [new ObjectID(ids)]);

exports.formatIdsArray = ids => (Array.isArray(ids) ? ids : [ids]);

exports.formatDuration = (duration) => {
  const paddedMinutes = duration.minutes() > 0 && duration.minutes() < 10
    ? duration.minutes().toString().padStart(2, 0)
    : duration.minutes();
  const hours = (duration.days() * 24) + duration.hours();

  return paddedMinutes ? `${hours}h${paddedMinutes}` : `${hours}h`;
};

exports.areObjectIdsEquals = (id1, id2) => !!id1 && !!id2 &&
  new ObjectID(id1).toHexString() === new ObjectID(id2).toHexString();

exports.doesArrayIncludeId = (array, id) => array.some(item => exports.areObjectIdsEquals(item, id));

exports.formatPhoneNumber = phoneNumber => (phoneNumber
  ? phoneNumber.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')
  : '');

exports.computeHoursWithDiff = (pay, key) => {
  const hours = pay[key] || 0;
  const diff = pay.diff && pay.diff[key] ? pay.diff[key] : 0;

  return hours + diff;
};

exports.getExclTaxes = (inclTaxes, vat) => (vat ? inclTaxes / (1 + (vat / 100)) : inclTaxes);

exports.getInclTaxes = (exclTaxes, vat) => (vat ? exclTaxes * (1 + (vat / 100)) : exclTaxes);

exports.sumReduce = (array, key) => array.reduce((sum, b) => NumbersHelper.add(sum, (b[key] || 0)), 0);
