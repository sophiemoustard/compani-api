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
const Card = require('../../models/Card');

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
  if (!questionnaire) throw Boom.notFound();

  const loggedUserVendorRole = get(req, 'auth.credentials.role.vendor.name');
  if (![TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(loggedUserVendorRole) &&
    questionnaire.status !== PUBLISHED) {
    throw Boom.forbidden();
  }

  return null;
};

exports.authorizeQuestionnaireEdit = async (req) => {
  const questionnaire = await Questionnaire.findOne({ _id: req.params._id }, { status: 1, type: 1 }).lean();
  if (!questionnaire) throw Boom.notFound();

  if (questionnaire.status === PUBLISHED && !req.payload.title) throw Boom.forbidden();

  const isQuestionnaireWithSameTypePublished = await Questionnaire.countDocuments(
    { type: questionnaire.type, status: PUBLISHED }
  );
  if (req.payload.status === PUBLISHED && isQuestionnaireWithSameTypePublished) throw Boom.forbidden();

  return null;
};

exports.authorizeCardDeletion = async (req) => {
  const card = await Card.countDocuments({ _id: req.params.cardId });
  if (!card) throw Boom.notFound();

  const questionnaire = await Questionnaire.countDocuments({ cards: req.params.cardId, status: PUBLISHED });
  if (questionnaire) throw Boom.forbidden();

  return null;
};
