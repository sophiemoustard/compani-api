const Boom = require('@hapi/boom');
const Holding = require('../../models/Holding');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeHoldingCreation = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await Holding
    .countDocuments({ name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].holdingExists);

  return null;
};
