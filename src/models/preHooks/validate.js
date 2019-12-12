const Boom = require('boom');
const get = require('lodash/get');
const { ObjectID } = require('mongodb');

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
  validateAggregation(next) {
<<<<<<< HEAD
    if (get(this, 'options.allCompanies', null)) return next();
    const companyId = get(this, 'options.company', null);
    if (!companyId) next(Boom.badRequest());
    this.pipeline().unshift({ $match: { company: new ObjectID(companyId) } });
=======
    if (get(this, 'options.allCompanies', null)) next();
    const companyId = get(this, 'options.company', null);
    if (!companyId) next(Boom.badRequest());
    this.pipeline().unshift({ $match: { company: companyId } });
>>>>>>> COM-908 add prehandler for bills
    next();
  },
};
