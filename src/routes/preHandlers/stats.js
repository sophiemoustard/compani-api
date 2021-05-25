const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');
const Sector = require('../../models/Sector');
const User = require('../../models/User');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');

const { language } = translate;

exports.authorizeGetStats = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (req.query.customer) {
    const customer = await Customer.findById(req.query.customer).lean();

    if (!customer) throw Boom.notFound(translate[language].customerNotFound);
    if (customer.company.toHexString() !== companyId.toHexString()) throw Boom.forbidden();
  }

  if (req.query.sector) {
    const sectors = UtilsHelper.formatIdsArray(req.query.sector);
    const sectorsCount = await Sector.countDocuments({ _id: { $in: sectors }, company: companyId });
    if (sectors.length !== sectorsCount) throw Boom.forbidden();
  }

  if (req.query.auxiliary) {
    const auxiliary = await User.countDocuments({ _id: req.query.auxiliary, company: companyId });
    if (!auxiliary) throw Boom.forbidden();
  }

  return null;
};
