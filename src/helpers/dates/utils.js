const { CompaniDate } = require('./companiDates');

exports.ascendingSort = (a, b) => {
  if (CompaniDate(a).isSame(b)) return 0;

  return CompaniDate(a).isAfter(b) ? 1 : -1;
};

exports.descendingSort = (a, b) => {
  if (CompaniDate(a).isSame(b)) return 0;

  return CompaniDate(a).isBefore(b) ? 1 : -1;
};
