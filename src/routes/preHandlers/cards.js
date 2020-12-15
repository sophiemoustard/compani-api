const Boom = require('@hapi/boom');
const get = require('lodash/get');
const has = require('lodash/has');
const Card = require('../../models/Card');
const {
  FILL_THE_GAPS,
  FLASHCARD,
  PUBLISHED,
  QUESTION_ANSWER_MAX_ANSWERS_COUNT,
  QUESTION_ANSWER_MIN_ANSWERS_COUNT,
  FLASHCARD_TEXT_MAX_LENGTH,
  MULTIPLE_CHOICE_QUESTION,
  QUESTION_ANSWER,
  SINGLE_CHOICE_QUESTION,
  MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT,
  MULTIPLE_CHOICE_QUESTION_MIN_ANSWERS_COUNT,
  SINGLE_CHOICE_QUESTION_MAX_FALSY_ANSWERS_COUNT,
  SINGLE_CHOICE_QUESTION_MIN_FALSY_ANSWERS_COUNT,
  ORDER_THE_SEQUENCE,
  ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT,
  ORDER_THE_SEQUENCE_MIN_ANSWERS_COUNT,
  FILL_THE_GAPS_MAX_ANSWERS_COUNT,
} = require('../../helpers/constants');
const Activity = require('../../models/Activity');

const checkFlashCard = (payload) => {
  const { text } = payload;
  if (text && text.length > FLASHCARD_TEXT_MAX_LENGTH) return Boom.badRequest();

  return null;
};

const checkFillTheGap = (payload) => {
  const { gappedText } = payload;

  if (!gappedText) return null;

  const { outerAcc, gapAcc } = parseTagCode(gappedText);

  const validTagging = isValidTagging(outerAcc, gapAcc);
  const validAnswerInTag = isValidAnswerInTag(gapAcc);
  const validAnswersCaracters = gapAcc.every(answer => isValidAnswerCaracters(answer));
  const validAnswersLength = isValidAnswersLength(gapAcc);
  const validTagsCount = isValidTagsCount(gapAcc);

  if (!validTagging || !validAnswersCaracters || !validAnswersLength || !validTagsCount ||
      !validAnswerInTag) return Boom.badRequest();

  return null;
};

exports.authorizeCardUpdate = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  switch (card.template) {
    case FILL_THE_GAPS:
      return checkFillTheGap(req.payload);
    case FLASHCARD:
      return checkFlashCard(req.payload);
    default:
      return null;
  }
};

exports.authorizeCardAnswerCreation = async (req) => {
  const card = await Card.findOne({
    _id: req.params._id,
    $or: [
      { 'qcAnswers._id': req.params.answerId },
      { 'orderedAnswers._id': req.params.answerId },
      { 'falsyGapAnswer._id': req.params.answerId },
    ],
  }).lean();
  if (!card) throw Boom.notFound();

  switch (card.template) {
    case QUESTION_ANSWER:
      if (card.qcAnswers.length >= QUESTION_ANSWER_MAX_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case SINGLE_CHOICE_QUESTION:
      if (card.qcAnswers.length >= SINGLE_CHOICE_QUESTION_MAX_FALSY_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case MULTIPLE_CHOICE_QUESTION:
      if (card.qcAnswers.length >= MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case ORDER_THE_SEQUENCE:
      if (card.orderedAnswers.length >= ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case FILL_THE_GAPS:
      if (card.falsyGapAnswers.length >= FILL_THE_GAPS_MAX_ANSWERS_COUNT) return Boom.forbidden();
      break;
  }

  const activity = await Activity.findOne({ cards: req.params._id }).lean();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return card;
};

exports.authorizeCardAnswerUpdate = async (req) => {
  const card = await Card.findOne({
    _id: req.params._id,
    $or: [
      { 'qcAnswers._id': req.params.answerId },
      { 'orderedAnswers._id': req.params.answerId },
      { 'falsyGapAnswers._id': req.params.answerId },
    ],
  }).lean();
  if (!card) throw Boom.notFound();

  if (has(req.payload, 'correct') && card.template !== MULTIPLE_CHOICE_QUESTION) throw Boom.badRequest();

  if (card.template === FILL_THE_GAPS && !isValidAnswerCaracters(req.payload.text)) throw Boom.badRequest();

  return card;
};

exports.authorizeCardAnswerDeletion = async (req) => {
  const card = await Card.findOne({
    _id: req.params._id,
    $or: [{ 'qcAnswers._id': req.params.answerId }, { 'orderedAnswers._id': req.params.answerId }],
  }).lean();
  if (!card) throw Boom.notFound();

  switch (card.template) {
    case QUESTION_ANSWER:
      if (card.qcAnswers.length <= QUESTION_ANSWER_MIN_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case SINGLE_CHOICE_QUESTION:
      if (card.qcAnswers.length <= SINGLE_CHOICE_QUESTION_MIN_FALSY_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case MULTIPLE_CHOICE_QUESTION:
      if (card.qcAnswers.length <= MULTIPLE_CHOICE_QUESTION_MIN_ANSWERS_COUNT) return Boom.forbidden();
      break;
    case ORDER_THE_SEQUENCE:
      if (card.orderedAnswers.length <= ORDER_THE_SEQUENCE_MIN_ANSWERS_COUNT) return Boom.forbidden();
      break;
  }

  const activity = await Activity.findOne({ cards: req.params._id }).lean();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return card;
};

exports.authorizeCardDeletion = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  const activity = await Activity.findOne({ cards: req.params._id }).lean();
  if (activity.status === PUBLISHED) throw Boom.forbidden();

  return null;
};

exports.getCardMediaPublicId = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  return get(card, 'media.publicId') || '';
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

const isValidAnswerCaracters = answer => /^[a-zA-Z0-9àâçéèêëîïôûùü\040'-]*$/.test(answer);

const isValidAnswersLength = answers => answers.every(v => v.length > 0 && v.length < 16);

const isValidTagsCount = answers => answers.length > 0 && answers.length < 3;
