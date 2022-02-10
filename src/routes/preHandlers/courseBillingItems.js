const Boom = require('@hapi/boom');
const CourseBillingItem = require('../../models/CourseBillingItem');
const translate = require('../../helpers/translate');

const { language } = translate;

exports.authorizeCourseBillingItemCreation = async (req) => {
  const { name } = req.payload;
  const nameAlreadyExists = await CourseBillingItem.countDocuments({ name }, { limit: 1 });
  if (nameAlreadyExists) throw Boom.conflict(translate[language].courseBillingItemExists);

  return null;
};
