const { CompaniDate } = require('./companiDates');
const { CompaniDuration } = require('./companiDurations');

exports.ascendingSort = (a, b) => {
  if (CompaniDate(a).isSame(b)) return 0;

  return CompaniDate(a).isAfter(b) ? 1 : -1;
};

exports.descendingSort = (a, b) => {
  if (CompaniDate(a).isSame(b)) return 0;

  return CompaniDate(a).isBefore(b) ? 1 : -1;
};

exports.ascendingSortBy = key => (a, b) => {
  if (CompaniDate(a[key]).isSame(b[key])) return 0;

  return CompaniDate(a[key]).isAfter(b[key]) ? 1 : -1;
};

exports.descendingSortBy = key => (a, b) => {
  if (CompaniDate(a[key]).isSame(b[key])) return 0;

  return CompaniDate(a[key]).isBefore(b[key]) ? 1 : -1;
};

exports.durationAscendingSort = (miscDurationA, miscDurationB) => {
  const companiDurationA = CompaniDuration(miscDurationA);
  const companiDurationB = CompaniDuration(miscDurationB);
  if (companiDurationA.isEquivalentTo(companiDurationB)) return 0;

  return companiDurationA.isLongerThan(companiDurationB) ? 1 : -1;
};

exports.formatSecondsToISODuration = sec => `PT${sec}S`;
