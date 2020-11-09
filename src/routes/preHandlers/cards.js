const Boom = require('@hapi/boom');
const Card = require('../../models/Card');
const {
  FILL_THE_GAPS,
  ORDER_THE_SEQUENCE,
  MULTIPLE_CHOICE_QUESTION,
  FLASHCARD,
  PUBLISHED,
  QUESTION_ANSWER,
  QUESTION_ANSWER_MAX_ANSWERS_COUNT,
  QUESTION_ANSWER_MIN_ANSWERS_COUNT,
  FLASHCARD_TEXT_MAX_LENGTH,
} = require('../../helpers/constants');
const Activity = require('../../models/Activity');

const checkFillTheGap = (payload, card) => {
  const { gappedText, falsyGapAnswers } = payload;

  if (gappedText) {
    const { outerAcc, gapAcc } = parseTagCode(gappedText);

    const validTagging = isValidTagging(outerAcc, gapAcc);
    const validAnswerInTag = isValidAnswerInTag(gapAcc);
    const validAnswersCaracters = isValidAnswersCaracters(gapAcc);
    const validAnswersLength = isValidAnswersLength(gapAcc);
    const validTagsCount = isValidTagsCount(gapAcc);

    if (!validTagging || !validAnswersCaracters || !validAnswersLength || !validTagsCount ||
      !validAnswerInTag) return Boom.badRequest();
  } else if (falsyGapAnswers) {
    if (falsyGapAnswers.length === 1 && card.falsyGapAnswers.length > 1) return Boom.badRequest();

    const validAnswersCaracters = isValidAnswersCaracters(falsyGapAnswers);
    const validAnswersLength = isValidAnswersLength(falsyGapAnswers);

    if (!validAnswersCaracters || !validAnswersLength) return Boom.badRequest();
  }

  return null;
};

const checkOrderTheSequence = (payload, card) => {
  const { orderedAnswers } = payload;
  if (orderedAnswers && orderedAnswers.length === 1 && card.orderedAnswers.length > 1) return Boom.badRequest();

  return null;
};

const checkQuestionAnswer = (payload, card) => {
  const { questionAnswers } = payload;
  if (questionAnswers && questionAnswers.length === 1 && card.questionAnswers.length > 1) return Boom.badRequest();

  return null;
};

const checkFlashCard = (payload) => {
  const { text } = payload;
  if (text && text.length > FLASHCARD_TEXT_MAX_LENGTH) return Boom.badRequest();

  return null;
};

const checkMultipleChoiceQuestion = (payload, card) => {
  const { qcmAnswers } = payload;

  if (qcmAnswers) {
    const noCorrectAnswer = !qcmAnswers.find(ans => ans.correct);
    const removeRequiredAnswer = qcmAnswers.length === 1 && card.qcmAnswers.length > 1;
    if (removeRequiredAnswer || noCorrectAnswer) return Boom.badRequest();
  }

  return null;
};

exports.authorizeCardUpdate = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  switch (card.template) {
    case FILL_THE_GAPS:
      return checkFillTheGap(req.payload, card);
    case ORDER_THE_SEQUENCE:
      return checkOrderTheSequence(req.payload, card);
    case MULTIPLE_CHOICE_QUESTION:
      return checkMultipleChoiceQuestion(req.payload, card);
    case QUESTION_ANSWER:
      return checkQuestionAnswer(req.payload, card);
    case FLASHCARD:
      return checkFlashCard(req.payload);
    default:
      return null;
  }
};

exports.authorizeCardAnswerCreation = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();
  if (card.questionAnswers.length >= QUESTION_ANSWER_MAX_ANSWERS_COUNT) return Boom.forbidden();

  const activity = await Activity.findOne({ cards: req.params._id }).lean();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.authorizeCardAnswerUpdate = async (req) => {
  const card = await Card.findOne({ _id: req.params._id, 'questionAnswers._id': req.params.answerId }).lean();
  if (!card) throw Boom.notFound();

  return null;
};

exports.authorizeCardAnswerDeletion = async (req) => {
  const card = await Card.findOne({ _id: req.params._id, 'questionAnswers._id': req.params.answerId }).lean();
  if (!card) throw Boom.notFound();
  if (card.questionAnswers.length <= QUESTION_ANSWER_MIN_ANSWERS_COUNT) return Boom.forbidden();

  const activity = await Activity.findOne({ cards: req.params._id }).lean();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.authorizeCardDeletion = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  const activity = await Activity.findOne({ cards: req.params._id }).lean();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

// fill the gap validation
const parseTagCode = str => parseTagCodeRecursively('', [], str);

const parseTagCodeRecursively = (outerAcc, gapAcc, str) => {
  const splitedStr = str.match(/(.*?)<trou>(.*?)<\/trou>(.*)/s);

  if (!splitedStr) return { outerAcc: outerAcc.concat(' ', str), gapAcc };

  gapAcc.push(splitedStr[2]);
  return parseTagCodeRecursively(outerAcc.concat(' ', splitedStr[1]), gapAcc, splitedStr[3]);
};

const containLonelyTag = value => /<trou>|<\/trou>/g.test(value);

const isValidTagging = (outerAcc, answers) => !containLonelyTag(outerAcc) && !answers.some(v => containLonelyTag(v));

const isValidAnswerInTag = gapAcc => !gapAcc.some(v => v.trim() !== v);

const isValidAnswersCaracters = answers => answers.every(v => /^[a-zA-Z0-9àâçéèêëîïôûùü\040'-]*$/.test(v));

const isValidAnswersLength = answers => answers.every(v => v.length > 0 && v.length < 16);

const isValidTagsCount = answers => answers.length > 0 && answers.length < 3;
