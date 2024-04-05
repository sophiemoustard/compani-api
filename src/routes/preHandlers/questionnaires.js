const Boom = require('@hapi/boom');
const get = require('lodash/get');
const {
  DRAFT,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  PUBLISHED,
  TRAINER,
  BLENDED,
} = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const Questionnaire = require('../../models/Questionnaire');
const Card = require('../../models/Card');
const Course = require('../../models/Course');
const Program = require('../../models/Program');

const { language } = translate;

exports.authorizeQuestionnaireCreation = async (req) => {
  const { type, program: programId } = req.payload;
  let query = { type, status: DRAFT };

  if (programId) {
    const program = await Program.countDocuments({ _id: programId });
    if (!program) throw Boom.notFound();

    query = { ...query, program: programId };
  }

  const draftQuestionnaires = await Questionnaire.countDocuments(query);
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

exports.authorizeUserQuestionnairesGet = async (req) => {
  const course = await Course.countDocuments({ _id: req.query.course });
  if (!course) throw Boom.notFound();

  return course;
};

exports.authorizeQuestionnaireEdit = async (req) => {
  const questionnaire = await Questionnaire
    .findOne({ _id: req.params._id }, { status: 1, type: 1, program: 1 })
    .populate({ path: 'cards', select: '-__v -createdAt -updatedAt' })
    .lean({ virtuals: true });
  if (!questionnaire) throw Boom.notFound();

  if (questionnaire.status === PUBLISHED && !req.payload.name) throw Boom.forbidden();

  const questionnaireQuery = {
    type: questionnaire.type,
    status: PUBLISHED,
    ...(questionnaire.program && { program: questionnaire.program }),
  };
  const publishedQuestionnaireWithSameTypeExists = await Questionnaire.countDocuments(questionnaireQuery);
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

exports.authorizeGetFollowUp = async (req) => {
  const credentials = get(req, 'auth.credentials');
  if (req.query.course) {
    const countQuery = get(credentials, 'role.vendor.name') === TRAINER
      ? { _id: req.query.course, format: BLENDED, trainer: credentials._id }
      : { _id: req.query.course, format: BLENDED };
    const course = await Course.countDocuments(countQuery);
    if (!course) throw Boom.notFound();
  } else if (get(credentials, 'role.vendor.name') === TRAINER) throw Boom.forbidden();

  const questionnaire = await Questionnaire.countDocuments({ _id: req.params._id });
  if (!questionnaire) throw Boom.notFound();

  return null;
};

exports.authorizeQuestionnaireQRCodeGet = async (req) => {
  const loggedUserVendorRole = get(req, 'auth.credentials.role.vendor.name');
  if (req.query.course) {
    const course = await Course.findOne({ _id: req.query.course }).lean();
    if (!course) throw Boom.notFound();

    if (!loggedUserVendorRole) throw Boom.forbidden();
  }

  return null;
};

exports.authorizeGetList = async (req) => {
  const { program: programId, course: courseId } = req.query;
  if (programId) {
    const program = await Program.countDocuments({ _id: programId });
    if (!program) throw Boom.notFound();
  }

  if (courseId) {
    const course = await Course.countDocuments({ _id: courseId });
    if (!course) throw Boom.notFound();
  }

  return null;
};
