const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const {
  TRANSITION,
  TITLE_TEXT_MEDIA,
  TITLE_TEXT,
  TEXT_MEDIA,
  FLASHCARD,
  FILL_THE_GAPS,
  MULTIPLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION,
  ORDER_THE_SEQUENCE,
  OPEN_QUESTION,
  SURVEY,
  QUESTION_ANSWER,
  FILL_THE_GAPS_MAX_ANSWERS_COUNT,
  CHOICE_QUESTION_MIN_ANSWERS_COUNT,
  CHOICE_QUESTION_MAX_ANSWERS_COUNT,
  ORDER_THE_SEQUENCE_MIN_ANSWERS_COUNT,
  ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT,
  QUESTION_ANSWER_MIN_ANSWERS_COUNT,
  QUESTION_ANSWER_MAX_ANSWERS_COUNT,
  QC_ANSWER_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  GAP_ANSWER_MAX_LENGTH,
  FILL_THE_GAPS_MIN_ANSWERS_COUNT,
} = require('../../helpers/constants');

const labelsValidation = (labels) => {
  let validation;

  if (labels && Object.keys(labels).length === 2) {
    validation = Joi.object().keys({ 1: Joi.string().required(), 5: Joi.string().required() });
  } else {
    validation = Joi.object().keys({
      1: Joi.string().required(),
      2: Joi.string().required(),
      3: Joi.string().required(),
      4: Joi.string().required(),
      5: Joi.string().required(),
    });
  }

  return validation;
};

exports.cardValidationByTemplate = (template, labels = {}) => {
  switch (template) {
    case TRANSITION:
      return Joi.object().keys({
        title: Joi.string().required(),
      });
    case TITLE_TEXT_MEDIA:
      return Joi.object().keys({
        title: Joi.string().required(),
        text: Joi.string().required(),
        media: Joi.object().keys({
          publicId: Joi.string().required(),
          link: Joi.string().required(),
        }).required(),
      });
    case TITLE_TEXT:
      return Joi.object().keys({
        title: Joi.string().required(),
        text: Joi.string().required(),
      });
    case TEXT_MEDIA:
      return Joi.object().keys({
        text: Joi.string().required(),
        media: Joi.object().keys({
          publicId: Joi.string().required(),
          link: Joi.string().required(),
        }).required(),
      });
    case FLASHCARD:
      return Joi.object().keys({
        text: Joi.string().required(),
        backText: Joi.string().required(),
      });
    case FILL_THE_GAPS:
      return Joi.object().keys({
        gappedText: Joi.string().required(),
        gapAnswers: Joi.array()
          .items(Joi.object({
            text: Joi.string().max(GAP_ANSWER_MAX_LENGTH).required(),
            correct: Joi.boolean().required(),
          }))
          .has(Joi.object({ correct: true }))
          .min(FILL_THE_GAPS_MIN_ANSWERS_COUNT)
          .max(FILL_THE_GAPS_MAX_ANSWERS_COUNT)
          .custom((values, helpers) => {
            const correctAnswers = values.filter(answer => answer.correct);
            if (correctAnswers.length < 1 || correctAnswers.length > 2) {
              return helpers.message('There must be one or two correct answers');
            }
            return values;
          }),
        explanation: Joi.string().required(),
      });
    case SINGLE_CHOICE_QUESTION:
      return Joi.object().keys({
        question: Joi.string().required().max(QUESTION_MAX_LENGTH),
        qcAnswers: Joi.array()
          .items(Joi.object({
            text: Joi.string().required().max(QC_ANSWER_MAX_LENGTH),
            correct: Joi.boolean().required(),
          }))
          .has(Joi.object({ correct: true }))
          .min(CHOICE_QUESTION_MIN_ANSWERS_COUNT)
          .max(CHOICE_QUESTION_MAX_ANSWERS_COUNT)
          .custom((values, helpers) => {
            const correctAnswers = values.filter(answer => answer.correct);
            if (correctAnswers.length !== 1) {
              return helpers.message('There must be exactly one correct answer');
            }
            return values;
          }),
        explanation: Joi.string().required(),
      });
    case ORDER_THE_SEQUENCE:
      return Joi.object().keys({
        question: Joi.string().required().max(QUESTION_MAX_LENGTH),
        orderedAnswers: Joi.array().items(Joi.object({
          text: Joi.string().required(),
        })).min(ORDER_THE_SEQUENCE_MIN_ANSWERS_COUNT).max(ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT),
        explanation: Joi.string().required(),
      });
    case MULTIPLE_CHOICE_QUESTION:
      return Joi.object().keys({
        question: Joi.string().required().max(QUESTION_MAX_LENGTH),
        qcAnswers: Joi.array()
          .items(Joi.object({
            text: Joi.string().required().max(QC_ANSWER_MAX_LENGTH),
            correct: Joi.boolean().required(),
          }))
          .has(Joi.object({ correct: true }))
          .min(CHOICE_QUESTION_MIN_ANSWERS_COUNT)
          .max(CHOICE_QUESTION_MAX_ANSWERS_COUNT),
        explanation: Joi.string().required(),
      });
    case SURVEY:
      return Joi.object().keys({
        question: Joi.string().required().max(QUESTION_MAX_LENGTH),
        labels: labelsValidation(labels),
      });
    case OPEN_QUESTION:
      return Joi.object().keys({
        question: Joi.string().required().max(QUESTION_MAX_LENGTH),
      });
    case QUESTION_ANSWER:
      return Joi.object().keys({
        question: Joi.string().required().max(QUESTION_MAX_LENGTH),
        qcAnswers: Joi.array().items(Joi.object({
          text: Joi.string().max(QC_ANSWER_MAX_LENGTH).required(),
        })).min(QUESTION_ANSWER_MIN_ANSWERS_COUNT).max(QUESTION_ANSWER_MAX_ANSWERS_COUNT),
      });
    default:
      return Joi.object().keys();
  }
};
