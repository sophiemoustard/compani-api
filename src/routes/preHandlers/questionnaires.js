const Boom = require('@hapi/boom');
const { DRAFT } = require('../../helpers/constants');
const Questionnaire = require('../../models/Questionnaire');

exports.authorizeQuestionnaireCreation = async (req) => {
  const { type } = req.payload;
  const draftQuestionnaires = await Questionnaire.countDocuments({ type, status: DRAFT });

  if (draftQuestionnaires) throw Boom.forbidden();

  return null;
};
