const omit = require('lodash/omit');
const isEmpty = require('lodash/isEmpty');
const { ObjectId } = require('mongodb');
const Intl = require('intl');
const moment = require('../extensions/moment');
const { CIVILITY_LIST } = require('./constants');
const DatesHelper = require('./dates');
const { CompaniDate } = require('./dates/companiDates');
const { CompaniDuration } = require('./dates/companiDurations');
const NumbersHelper = require('./numbers');

exports.getLastVersion = (versions, dateKey) => {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];

  return [...versions].sort(DatesHelper.descendingSort(dateKey))[0];
};

exports.getFirstVersion = (versions, dateKey) => {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];

  return [...versions].sort(DatesHelper.ascendingSort(dateKey))[0];
};

exports.mergeLastVersionWithBaseObject = (baseObj, dateKey) => {
  const lastVersion = exports.getLastVersion(baseObj.versions, dateKey);
  if (!lastVersion) throw new Error('Unable to find last version from base object !');

  return { ...lastVersion, ...omit(baseObj, ['versions', 'createdAt']) };
};

const defaultFilterMethod = date => ver => DatesHelper.isSameOrBefore(ver.startDate, date, 'd') &&
  (!ver.endDate || DatesHelper.isSameOrAfter(ver.endDate, date, 'd'));

// `obj.versions` should be sort in descending order
exports.getMatchingVersion = (date, obj, dateKey, filterMethod = defaultFilterMethod) => {
  if (obj.versions.length === 0) return null;

  const matchingVersion = [...obj.versions]
    .filter(filterMethod(date))
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

exports.getFixedNumber = (number, toFixedNb = 2) =>
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

exports.roundFrenchNumber = (number, digits) => {
  const nf = new Intl.NumberFormat(
    'fr-FR',
    { minimumFractionDigits: digits, style: 'decimal', maximumFractionDigits: digits }
  );
  return nf.format(number);
};

exports.formatHour = val => (val ? `${exports.roundFrenchNumber(val, 2)}h` : `${exports.roundFrenchNumber(0, 2)}h`);

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

exports.formatFloatForExport = (number, decimals = 2) => {
  if (number == null || Number.isNaN(number) || number === '') return '';
  return parseFloat(number).toFixed(decimals).replace('.', ',');
};

exports.formatArrayOrStringQueryParam = (param, keyName) =>
  (Array.isArray(param) ? param.map(id => ({ [keyName]: id })) : [{ [keyName]: param }]);

exports.capitalize = (s) => {
  if (typeof s !== 'string') return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

exports.getDaysRatioBetweenTwoDates = (start, end, shouldPayHolidays) => {
  let holidays = 0;
  let sundays = 0;
  let businessDays = 0;
  if (moment(end).isBefore(start)) return { holidays, sundays, businessDays };

  const range = Array.from(moment().range(start, end).by('days'));
  for (const day of range) {
    // startOf('day') is necessery to check fr holidays in business day
    if (shouldPayHolidays && day.startOf('d').isHoliday() && day.day() !== 0) holidays += 1;
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

exports.formatObjectIdsArray = ids => (Array.isArray(ids) ? ids.map(id => new ObjectId(id)) : [new ObjectId(ids)]);

exports.formatIdsArray = ids => (Array.isArray(ids) ? ids : [ids]);

exports.areObjectIdsEquals = (id1, id2) => !!id1 && !!id2 &&
  new ObjectId(id1).toHexString() === new ObjectId(id2).toHexString();

exports.doesArrayIncludeId = (array, id) => array.some(item => exports.areObjectIdsEquals(item, id));

exports.isStringedObjectId = value => typeof value === 'string' && !!value.match(/^[0-9a-fA-F]{24}$/);

exports.formatPhoneNumber = phoneNumber => (phoneNumber
  ? phoneNumber.replace(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')
  : '');

exports.computeHoursWithDiff = (pay, key) => {
  const hours = pay[key] || 0;
  const diff = pay.diff && pay.diff[key] ? pay.diff[key] : 0;

  return hours + diff;
};

// Returns a string
exports.getExclTaxes = (inclTaxes, vat) => {
  if (!vat) return NumbersHelper.toString(inclTaxes);

  const decimalVat = NumbersHelper.add(1, NumbersHelper.divide(vat, 100));

  return NumbersHelper.divide(inclTaxes, decimalVat);
};

exports.sumReduce = (array, key) => array.reduce((sum, b) => NumbersHelper.add(sum, (b[key] || 0)), 0);

exports.computeExclTaxesWithDiscount = (exclTaxes, discount, vat) => {
  if (!discount) return NumbersHelper.toString(exclTaxes);

  const discountExclTaxes = exports.getExclTaxes(discount, vat);

  return NumbersHelper.subtract(exclTaxes, discountExclTaxes);
};

exports.getTotalDuration = (timePeriods) => {
  const totalDuration = timePeriods.reduce(
    (acc, tp) => acc.add(CompaniDuration(CompaniDate(tp.endDate).diff(tp.startDate, 'minutes'))),
    CompaniDuration()
  );

  return totalDuration.format();
};

exports.getTotalDurationForExport = (timePeriods) => {
  const totalDuration = timePeriods.reduce(
    (acc, tp) => acc.add(CompaniDuration(CompaniDate(tp.endDate).diff(tp.startDate, 'minutes'))),
    CompaniDuration()
  );

  return exports.formatFloatForExport(totalDuration.asHours());
};

exports.getDuration = (startDate, endDate) =>
  CompaniDuration(CompaniDate(endDate).diff(startDate, 'minutes')).format();

exports.getDurationForExport = (startDate, endDate) =>
  exports.formatFloatForExport(CompaniDuration(CompaniDate(endDate).diff(startDate, 'minutes')).asHours());

exports.computeDuration = durations => durations
  .reduce((acc, duration) => acc.add(duration), CompaniDuration());

exports.getKeysOf2DepthObject = object => Object.entries(object).reduce((acc, [key, value]) => {
  if (typeof value === 'object' && Object.keys(value).length) {
    return [...acc, ...Object.keys(value).map(k => `${key}.${k}`)];
  }

  return [...acc, key];
}, []);
