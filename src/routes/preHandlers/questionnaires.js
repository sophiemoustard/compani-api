const Boom = require('@hapi/boom');
const get = require('lodash/get');
const { DRAFT, TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN, PUBLISHED } = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const Questionnaire = require('../../models/Questionnaire');
const Card = require('../../models/Card');

const { language } = translate;

exports.authorizeQuestionnaireCreation = async (req) => {
  const { type } = req.payload;
  const draftQuestionnaires = await Questionnaire.countDocuments({ type, status: DRAFT });

  if (draftQuestionnaires) throw Boom.conflict(translate[language].draftQuestionnaireAlreadyExists);

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
  const questionnaire = await Questionnaire
    .findOne({ _id: req.params._id }, { status: 1, type: 1 })
    .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
    .lean({ virtuals: true });

  if (!questionnaire) throw Boom.notFound();

  if (questionnaire.status === PUBLISHED && !req.payload.title) throw Boom.forbidden();

  const publishedQuestionnaireWithSameTypeExists = await Questionnaire.countDocuments(
    { type: questionnaire.type, status: PUBLISHED }
  );
  if (req.payload.status === PUBLISHED && publishedQuestionnaireWithSameTypeExists) {
    throw Boom.conflict(translate[language].publishedQuestionnaireWithSameTypeExists);
  }
  if (req.payload.status === PUBLISHED && !questionnaire.areCardsValid) throw Boom.forbidden();

  return null;
};

exports.authorizeCardDeletion = async (req) => {
  const card = await Card.countDocuments({ _id: req.params.cardId });
  if (!card) throw Boom.notFound();

  const questionnaire = await Questionnaire.countDocuments({ cards: req.params.cardId, status: PUBLISHED });
  if (questionnaire) throw Boom.forbidden();

  return null;
};
