const Boom = require('@hapi/boom');
const CourseFundingOrganisationHelper = require('../helpers/courseFundingOrganisations');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const courseFundingOrganisations = await CourseFundingOrganisationHelper.list(req.query);

    return {
      message: courseFundingOrganisations.length
        ? translate[language].courseFundingOrganisationFound
        : translate[language].courseFundingOrganisationNotFound,
      data: { courseFundingOrganisations },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    const courseFundingOrganisation = await CourseFundingOrganisationHelper.create(req.payload);

    return {
      message: translate[language].courseFundingOrganisationCreated,
      data: { courseFundingOrganisation },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, create };
