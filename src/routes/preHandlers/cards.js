const Boom = require('@hapi/boom');
const Card = require('../../models/Card');
const { FILL_THE_GAPS } = require('../../helpers/constants');

const parseTagCode = (str) => {
  const outerAcc = '';
  const innerAcc = [];

  return str ? parseTagCodeRecursively(outerAcc, innerAcc, str) : Boom.badRequest();
};

const parseTagCodeRecursively = (outerAcc, innerAcc, str) => {
  const splitedStr = str.match(/(.*?)<trou>(.*?)<\/trou>(.*)/s);

  if (!splitedStr) {
    return { outerAcc: outerAcc.concat(' ', str), innerAcc };
  }

  innerAcc.push(splitedStr[2]);
  return parseTagCodeRecursively(outerAcc.concat(' ', splitedStr[1]), innerAcc, splitedStr[3]);
};

const containLonelyTag = value => /<trou>|<\/trou>/g.test(value);

exports.validFillTheGapsText = async (req) => {
  const card = await Card.findOne({ _id: req.params._id }).lean();
  if (!card) throw Boom.notFound();

  const { text } = req.payload;
  if (card.template === FILL_THE_GAPS && text) {
    const { outerAcc, innerAcc } = parseTagCode(text);

    const validTagging = !containLonelyTag(outerAcc) && !innerAcc.some(v => containLonelyTag(v));
    const validCaractersInner = innerAcc.every(v => /^[a-zA-Z0-9àâçéèêëîïôûùü '-]*$/.test(v));
    const validLengthInner = innerAcc.every(v => v.length > 0 && v.length < 16);
    const validNumberOfTags = innerAcc.length > 0 && innerAcc.length < 3;

    if (!validTagging || !validCaractersInner || !validLengthInner || !validNumberOfTags) return Boom.badRequest();
  }

  return null;
};
