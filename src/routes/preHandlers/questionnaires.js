const Boom = require('@hapi/boom');
const { DRAFT, EXPECTATIONS } = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const Questionnaire = require('../../models/Questionnaire');

const { language } = translate;

exports.authorizeQuestionnaireCreation = async () => {
  const draftQuestionnaires = await Questionnaire.countDocuments({ type: EXPECTATIONS, status: DRAFT });

  if (draftQuestionnaires) throw Boom.conflict(translate[language].draftQuestionnaireAlreadyExists);

  return null;
};
