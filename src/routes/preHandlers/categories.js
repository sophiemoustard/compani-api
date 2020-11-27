const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async (req) => {
  const existingCategoryName = await Category.countDocuments({ name: req.payload.name.toLowerCase() });
  return existingCategoryName ? Boom.conflict() : null;
};

exports.checkCategoryExists = async (req) => {
  const existingCategory = await Category.countDocuments({ _id: req.params._id });
  return !existingCategory ? Boom.notFound() : null;
};
