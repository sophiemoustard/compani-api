const { CompaniDate } = require('./companiDates');

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
