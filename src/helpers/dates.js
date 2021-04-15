exports.isBefore = (date1, date2) => new Date(date1) < new Date(date2);

exports.isSameOrBefore = (date1, date2) => new Date(date1) <= new Date(date2);

exports.isAfter = (date1, date2) => new Date(date1) > new Date(date2);

exports.isSameOrAfter = (date1, date2) => new Date(date1) >= new Date(date2);
