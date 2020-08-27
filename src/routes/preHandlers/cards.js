const Boom = require('@hapi/boom');
const Card = require('../../models/Card');
const {
  FILL_THE_GAPS,
  ORDER_THE_SEQUENCE,
  SINGLE_CHOICE_QUESTION,
  SINGLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT,
  FILL_THE_GAPS_MAX_ANSWERS_COUNT,
  MULTIPLE_CHOICE_QUESTION,
  MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT,
} = require('../../helpers/constants');

const checkFillTheGap = (payload, card) => {
  const { text, falsyAnswers } = payload;

  if (text) {
    const { outerAcc, gapAcc } = parseTagCode(text);

    const validTagging = isValidTagging(outerAcc, gapAcc);
    const validAnswerInTag = isValidAnswerInTag(gapAcc);
    const validAnswersCaracters = isValidAnswersCaracters(gapAcc);
    const validAnswersLength = isValidAnswersLength(gapAcc);
    const validTagsCount = isValidTagsCount(gapAcc);

    if (!validTagging || !validAnswersCaracters || !validAnswersLength || !validTagsCount ||
      !validAnswerInTag) return Boom.badRequest();
  } else if (falsyAnswers) {
    if (falsyAnswers.length === 1 && card.falsyAnswers.length > 1) return Boom.badRequest();
    if (falsyAnswers.length > FILL_THE_GAPS_MAX_ANSWERS_COUNT) return Boom.badRequest();

    const validAnswersCaracters = isValidAnswersCaracters(falsyAnswers);
    const validAnswersLength = isValidAnswersLength(falsyAnswers);

    if (!validAnswersCaracters || !validAnswersLength) return Boom.badRequest();
  }

  return null;
};

const checkSingleChoiceQuestion = (payload) => {
  const { falsyAnswers } = payload;

  if (falsyAnswers && falsyAnswers.length > SINGLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT) return Boom.badRequest();

  return null;
};

const checkOrderTheSequence = (payload, card) => {
  const { orderedAnswers } = payload;
  if (orderedAnswers && orderedAnswers.length === 1 && card.orderedAnswers.length > 1) return Boom.badRequest();

  return null;
};

const checkMultipleChoiceQuestion = (payload, card) => {
  const { qcmAnswers } = payload;
  const singleAnswerRemoval = qcmAnswers && qcmAnswers.length === 1 && card.qcmAnswers.length > 1;
  const tooMuchAnswers = qcmAnswers && qcmAnswers.length > MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT;

  if (singleAnswerRemoval || tooMuchAnswers) return Boom.badRequest();

  return null;
};

exports.authorizeCardUpdate = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  switch (card.template) {
    case FILL_THE_GAPS:
      return checkFillTheGap(req.payload, card);
    case SINGLE_CHOICE_QUESTION:
      return checkSingleChoiceQuestion(req.payload);
    case ORDER_THE_SEQUENCE:
      return checkOrderTheSequence(req.payload, card);
    case MULTIPLE_CHOICE_QUESTION:
      return checkMultipleChoiceQuestion(req.payload, card);
    default:
      return null;
  }
};

exports.authorizeCardDeletion = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

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

const isValidAnswersCaracters = answers => answers.every(v => /^[a-zA-Z0-9àâçéèêëîïôûùü\s'-]*$/.test(v));

const isValidAnswersLength = answers => answers.every(v => v.length > 0 && v.length < 16);

const isValidTagsCount = answers => answers.length > 0 && answers.length < 3;
