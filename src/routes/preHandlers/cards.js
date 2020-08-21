const Boom = require('@hapi/boom');
const Card = require('../../models/Card');
const { FILL_THE_GAPS } = require('../../helpers/constants');

exports.authorizeCardUpdate = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  if (card.template === FILL_THE_GAPS) {
    const { text, answers } = req.payload;

    if (text) {
      const { outerAcc, answersAcc } = parseTagCode(text);

      const validTagging = isValidTagging(outerAcc, answersAcc);
      const validCaracters = isValidCaracters(answersAcc);
      const validLength = isValidLength(answersAcc);
      const validTagsCount = isValidTagsCount(answersAcc);

      if (!validTagging || !validCaracters || !validLength || !validTagsCount) return Boom.badRequest();
    } else if (answers) {
      if (answers.length === 1 && card.answers.length > 1) return Boom.badRequest();

      const answersLabel = answers.map(a => a.label);

      const validCaracters = isValidCaracters(answersLabel);
      const validLength = isValidLength(answersLabel);

      if (!validCaracters || !validLength) return Boom.badRequest();
    }
  }

  return null;
};

// fill the gap validation
const parseTagCode = str => parseTagCodeRecursively('', [], str)

const parseTagCodeRecursively = (outerAcc, answersAcc, str) => {
  const splitedStr = str.match(/(.*?)<trou>(.*?)<\/trou>(.*)/s);

  if (!splitedStr) return { outerAcc: outerAcc.concat(' ', str), answersAcc };

  answersAcc.push(splitedStr[2]);
  return parseTagCodeRecursively(outerAcc.concat(' ', splitedStr[1]), answersAcc, splitedStr[3]);
};

const containLonelyTag = value => /<trou>|<\/trou>/g.test(value);

const isValidTagging = (outerAcc, answers) => !containLonelyTag(outerAcc) && !answers.some(v => containLonelyTag(v));

const isValidCaracters = (answers) => answers.every(v => /^[a-zA-Z0-9àâçéèêëîïôûùü\s'-]*$/.test(v));

const isValidLength = (answers) => answers.every(v => v.length > 0 && v.length < 16);

const isValidTagsCount = (answers) => answers.length > 0 && answers.length < 3;
