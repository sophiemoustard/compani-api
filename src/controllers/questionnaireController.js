const Boom = require('@hapi/boom');
const QuestionnaireHelper = require('../helpers/questionnaires');
const translate = require('../helpers/translate');

const { language } = translate;

const list = async (req) => {
  try {
    const questionnaires = await QuestionnaireHelper.list();

    return {
      message: questionnaires.length
        ? translate[language].questionnairesFound
        : translate[language].questionnairesNotFound,
      data: { questionnaires },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const create = async (req) => {
  try {
    await QuestionnaireHelper.create(req.payload);

    return { message: translate[language].questionnaireCreated };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const getById = async (req) => {
  try {
    const questionnaire = await QuestionnaireHelper.getQuestionnaire(req.params._id);

    return {
      message: translate[language].questionnaireFound,
      data: { questionnaire },
    };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

const update = async (req) => {
  try {
    await QuestionnaireHelper.update(req.params._id, req.payload);

    return { message: translate[language].questionnaireFound };
  } catch (e) {
    req.log('error', e);
    return Boom.isBoom(e) ? e : Boom.badImplementation(e);
  }
};

module.exports = { list, create, getById, update };
