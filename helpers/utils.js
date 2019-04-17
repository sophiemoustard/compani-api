const moment = require('moment-timezone');
const _ = require('lodash');

/*
** Get a date interval using range array and interval type
** PARAMS:
** - timeOption:
** --- slotToSub (time in number to subtract),
** --- slotToAdd (time in number to add)
** --- intervalType: "day", "week", "year", "hour"...
*/
const getIntervalInRange = (slotToSub, slotToAdd, intervalType) => {
  const dateNow = moment().tz('Europe/Paris');
  slotToSub = Math.abs(slotToSub);
  slotToAdd = Math.abs(slotToAdd);
  const finalInterval = {
    intervalBwd: dateNow.subtract(slotToSub, intervalType).format('YYYYMMDDHHmm'),
    // We have to (re)add slotToSub, because subtract() reallocates dateNow
    intervalFwd: dateNow.add(slotToAdd + slotToSub, intervalType).format('YYYYMMDDHHmm')
  };
  return finalInterval;
};

const clean = (obj) => {
  for (const k in obj) {
    if (obj[k] === undefined || obj[k] === '' ||
      (typeof obj[k] === 'object' && Object.keys(obj[k].length === 0)) ||
      (Array.isArray(obj[k]) && obj[k].length === 0)) {
      delete obj[k];
    }
  }

  return obj;
};

const getLastVersion = (versions, dateKey) => {
  if (!Array.isArray(versions)) throw new Error('versions must be an array !');
  if (typeof dateKey !== 'string') throw new Error('sortKey must be a string !');
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];
  return versions.sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))[0];
};

// `obj` should by sort in descending order
const getMatchingVersion = (date, obj) => {
  if (!Array.isArray(obj.versions)) throw new Error('versions must be an array !');
  if (obj.versions.length === 0) return null;

  const matchingVersion = obj.versions
    .filter(ver => moment(ver.startDate).isSameOrBefore(date, 'd') && (!ver.endDate || moment(ver.endDate).isSameOrAfter(date, 'd')))[0];
  if (!matchingVersion) return null;

  return { ..._.omit(obj, 'versions'), ..._.omit(matchingVersion, ['_id', 'createdAt']), versionId: matchingVersion._id };
};

const getDateQuery = (dates) => {
  if (dates.startDate && dates.endDate) return { $lt: moment(dates.endDate).endOf('day').toISOString(), $gte: moment(dates.startDate).startOf('day').toISOString() };
  if (dates.startDate) return { $gte: dates.startDate };
  return { $lt: dates.endDate };
};

module.exports = {
  getIntervalInRange,
  clean,
  getLastVersion,
  getMatchingVersion,
  getDateQuery,
};
