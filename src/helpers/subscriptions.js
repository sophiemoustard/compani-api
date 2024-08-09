const moment = require('moment');
const omit = require('lodash/omit');

exports.populateService = (service) => {
  if (!service || service.version) return null;

  const currentVersion = [...service.versions]
    .filter(version => moment(version.startDate).isSameOrBefore(new Date(), 'days'))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  return { ...currentVersion, ...omit(service, 'versions') };
};
