const Boom = require('boom');

module.exports = {
  validateQuery(next) {
    const query = this.getQuery();
    console.log('this', this.getQuery());
    if (!query.company) next(Boom.badRequest());
    next();
  },
  validatePayload(next) {
    if (!this.company) next(Boom.badRequest());
    next();
  },
};
