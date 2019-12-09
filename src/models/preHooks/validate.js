const Boom = require('boom');
const get = require('lodash/get');

module.exports = {
  validateQuery(next) {
    const query = this.getQuery();
    const isPopulate = get(query, '_id.$in', null);
    const hasCompany = (query.$and && query.$and.some(q => !!get(q, 'company', null))) || query.company;
    if (!hasCompany && !isPopulate) next(Boom.badRequest());
    next();
  },
  validatePayload(next) {
    if (!this.company) next(Boom.badRequest());
    next();
  },
};
