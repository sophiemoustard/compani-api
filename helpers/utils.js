const moment = require('moment-timezone');

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
    if (obj[k] === undefined || obj[k] === '' || obj[k] === {} || obj[k] === []) {
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

module.exports = {
  getIntervalInRange,
  clean,
  getLastVersion
};
