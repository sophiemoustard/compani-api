const Boom = require('@hapi/boom');
const Card = require('../../models/Card');
const { FILL_THE_GAPS, ORDER_THE_SEQUENCE } = require('../../helpers/constants');

const checkFillTheGap = (payload, card) => {
  const { text, answers } = payload;

  if (text) {
    const { outerAcc, gapAcc } = parseTagCode(text);

    const validTagging = isValidTagging(outerAcc, gapAcc);
    const validAnswersCaracters = isValidAnswersCaracters(gapAcc);
    const validAnswersLength = isValidAnswersLength(gapAcc);
    const validTagsCount = isValidTagsCount(gapAcc);

    if (!validTagging || !validAnswersCaracters || !validAnswersLength || !validTagsCount) return Boom.badRequest();
  } else if (answers) {
    if (answers.length === 1 && card.answers.length > 1) return Boom.badRequest();

    const answersLabel = answers.map(a => a.label);
    const validAnswersCaracters = isValidAnswersCaracters(answersLabel);
    const validAnswersLength = isValidAnswersLength(answersLabel);

    if (!validAnswersCaracters || !validAnswersLength) return Boom.badRequest();
  }

  return null;
}

exports.authorizeCardUpdate = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  switch (card.template) {
    case FILL_THE_GAPS:
      return checkFillTheGap(req.payload, card);
    case ORDER_THE_SEQUENCE:
      const { orderedAnswers } = req.payload;
      if (orderedAnswers && orderedAnswers.length === 1 && card.orderedAnswers.length > 1) return Boom.badRequest();
      break;
  }

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

const isValidAnswersCaracters = answers => answers.every(v => /^[a-zA-Z0-9àâçéèêëîïôûùü\s'-]*$/.test(v));

const isValidAnswersLength = answers => answers.every(v => v.length > 0 && v.length < 16);

const isValidTagsCount = answers => answers.length > 0 && answers.length < 3;
