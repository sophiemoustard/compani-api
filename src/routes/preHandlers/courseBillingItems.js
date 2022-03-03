const Boom = require('@hapi/boom');
const CourseBillingItem = require('../../models/CourseBillingItem');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCourseBillingItemCreation = async (req) => {
  const nameAlreadyExists = await CourseBillingItem
    .countDocuments({ name: req.payload.name }, { limit: 1 })
    .collation({ locale: 'fr', strength: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].courseBillingItemExists);

  return null;
};
