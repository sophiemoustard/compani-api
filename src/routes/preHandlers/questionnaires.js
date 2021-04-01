const Boom = require('@hapi/boom');
const { DRAFT } = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const Questionnaire = require('../../models/Questionnaire');

const { language } = translate;

exports.authorizeQuestionnaireCreation = async (req) => {
  const { type } = req.payload;
  const draftQuestionnaires = await Questionnaire.countDocuments({ type, status: DRAFT });

  if (draftQuestionnaires) throw Boom.conflict(translate[language].draftQuestionnaireAlreadyExists);

  return null;
};
