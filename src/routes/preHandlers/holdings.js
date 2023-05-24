const Boom = require('@hapi/boom');
const Company = require('../../models/Company');
const CompanyHolding = require('../../models/CompanyHolding');
const Holding = require('../../models/Holding');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeHoldingCreation = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await Holding
    .countDocuments({ name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].holdingExists);

  return null;
};

exports.authorizeHoldingUpdate = async (req) => {
  const company = await Company.countDocuments({ _id: req.payload.company });
  if (!company) throw Boom.notFound();

  const holding = await Holding.countDocuments({ _id: req.params._id });
  if (!holding) throw Boom.notFound();

  const companyHolding = await CompanyHolding.countDocuments({ company: req.payload.company });
  if (companyHolding) throw Boom.forbidden();

  return null;
};

exports.authorizeHoldingGet = async (req) => {
  const holding = await Holding.countDocuments({ _id: req.params._id });
  if (!holding) throw Boom.notFound();

  return null;
};
