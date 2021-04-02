const Boom = require('@hapi/boom');
const get = require('lodash/get');
const {
  DRAFT,
  EXPECTATIONS,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  PUBLISHED,
} = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const Questionnaire = require('../../models/Questionnaire');

const { language } = translate;

exports.authorizeQuestionnaireCreation = async (req) => {
  const { type } = req.payload;
  if (type !== EXPECTATIONS) return null;

  const draftQuestionnaires = await Questionnaire.countDocuments({ type, status: DRAFT });
  if (draftQuestionnaires) throw Boom.conflict(translate[language].draftExpectationQuestionnaireAlreadyExists);

  return null;
};
exports.authorizeQuestionnaireGet = async (req) => {
  const questionnaire = await Questionnaire.findOne({ _id: req.params._id }, { status: 1 }).lean();
  if (!questionnaire) return Boom.notFound();

  const loggedUserVendorRole = get(req, 'auth.credentials.role.vendor.name');
  if (![TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(loggedUserVendorRole) && questionnaire.status === DRAFT) {
    return Boom.forbidden();
  }

  return null;
};

exports.authorizeQuestionnaireEdit = async (req) => {
  const questionnaire = await Questionnaire.findOne({ _id: req.params._id }, { status: 1 }).lean();
  if (!questionnaire) return Boom.notFound();

  if (questionnaire.status === PUBLISHED) return Boom.forbidden();

  return null;
};
