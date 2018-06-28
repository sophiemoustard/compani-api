const moment = require('moment-timezone');

/*
** Get a date interval using range array and interval type
** PARAMS:
** - timeOption:
** --- slotToSub (time in number to subtract),
** --- slotToAdd (time in number to add)
** --- intervalType: "day", "week", "year", "hour"...
*/
exports.getIntervalInRange = (slotToSub, slotToAdd, intervalType) => {
  const dateNow = moment().tz('Europe/Paris');
  slotToSub = Math.abs(slotToSub);
  slotToAdd = Math.abs(slotToAdd);
  const finalInterval = {
    intervalBwd: dateNow.subtract(slotToSub, intervalType).format('YYYYMMDDHHmm'),
    // We have to (re)add slotToSub, because subtract() reallocates dateNow
    intervalFwd: dateNow.add(slotToAdd + slotToSub, intervalType).format('YYYYMMDDHHmm') };
  return finalInterval;
};
