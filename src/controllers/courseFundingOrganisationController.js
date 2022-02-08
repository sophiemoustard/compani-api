const Boom = require('@hapi/boom');
const CourseFundingOrganisationHelper = require('../helpers/courseFundingOrganisations');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const courseFundingOrganisations = await CourseFundingOrganisationHelper.list();

    return {
      message: courseFundingOrganisations.length
        ? translate[language].courseFundingOrganisationsFound
        : translate[language].courseFundingOrganisationsNotFound,
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

const remove = async (req) => {
  try {
    await CourseFundingOrganisationHelper.remove(req.params);

    return {
      message: translate[language].courseFundingOrganisationDeleted,
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, create, remove };
