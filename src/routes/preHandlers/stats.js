const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Customer = require('../../models/Customer');
const Sector = require('../../models/Sector');
const UserCompany = require('../../models/UserCompany');
const translate = require('../../helpers/translate');
const UtilsHelper = require('../../helpers/utils');

const { language } = translate;

exports.authorizeGetStats = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id', null);
  if (req.query.customer) {
    const customer = await Customer.findById(req.query.customer).lean();

    if (!customer) throw Boom.notFound(translate[language].customerNotFound);
    if (!UtilsHelper.areObjectIdsEquals(customer.company, companyId)) throw Boom.forbidden();
  }

  if (req.query.sector) {
    const sectors = UtilsHelper.formatIdsArray(req.query.sector);
    const sectorsCount = await Sector.countDocuments({ _id: { $in: sectors }, company: companyId });
    if (sectors.length !== sectorsCount) throw Boom.forbidden();
  }

  if (req.query.auxiliary) {
    const auxiliary = await UserCompany.countDocuments({ user: req.query.auxiliary, company: companyId });
    if (!auxiliary) throw Boom.forbidden();
  }

  return null;
};
