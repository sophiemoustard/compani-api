const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Surcharge = require('../../models/Surcharge');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeSurchargesUpdate = async (req) => {
  const companyId = get(req, 'auth.credentials.company._id');
  const surcharge = await Surcharge.findOne({ _id: req.params._id, company: companyId }).lean();

  if (!surcharge) throw Boom.notFound(translate[language].surchargesNotFound);

  return surcharge;
};
