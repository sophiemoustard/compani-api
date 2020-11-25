const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async (req) => {
  const categories = await Category.find({}).lean();
  for (const category of categories) if (category.name === req.payload.name) throw Boom.forbidden();

  return null;
};
