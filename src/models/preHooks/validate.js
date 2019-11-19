const Boom = require('boom');
const get = require('lodash/get');

module.exports = {
  validateQuery(next) {
    const query = this.getQuery();
    console.log(query);
    if (!query.company && !get(query, '_id.$in', null)) next(Boom.badRequest());
    next();
  },
  validatePayload(next) {
    if (!this.company) next(Boom.badRequest());
    next();
  },
};
