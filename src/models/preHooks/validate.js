const Boom = require('boom');
const get = require('lodash/get');

module.exports = {
  validateQuery(next) {
    const query = this.getQuery();
    console.log('query', query);
    const isPopulate = get(query, '_id.$in', null);
    const hasCompany = (query.$and && query.$and.some(q => !!get(q, 'company', null))) || query.company;
    console.log('hasCompany', hasCompany);
    console.log('isPopulate', isPopulate);
    console.log('!hasCompany && !isPopulate', !hasCompany && !isPopulate);
    if (!hasCompany && !isPopulate) {
      console.log('si si');
      next(Boom.badRequest());
    }
    next();
  },
  validatePayload(next) {
    if (!this.company) next(Boom.badRequest());
    next();
  },
};
