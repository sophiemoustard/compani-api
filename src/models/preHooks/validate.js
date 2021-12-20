const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { ObjectId } = require('mongodb');

module.exports = {
  validateQuery(next) {
    const query = this.getQuery();
    const isPopulate = get(query, '_id.$in', null);
    const hasCompany = (query.$and && query.$and.some(q => !!q.company)) ||
      (query.$or && query.$or.every(q => !!q.company)) ||
      query.company;
    const { isVendorUser, requestingOwnInfos, allCompanies } = this.getOptions();

    if (!hasCompany && !isPopulate && !isVendorUser && !requestingOwnInfos && !allCompanies) next(Boom.badRequest());
    next();
  },
  validateAggregation(next) {
    if (get(this, 'options.allCompanies', null)) next();
    else {
      const companyId = get(this, 'options.company', null);
      if (!companyId) next(Boom.badRequest());
      this.pipeline().unshift({ $match: { company: new ObjectId(companyId) } });
      next();
    }
  },
  validateUpdateOne(next) {
    const query = this.getQuery();
    if (!query.company) next(Boom.badRequest());
    next();
  },
};
