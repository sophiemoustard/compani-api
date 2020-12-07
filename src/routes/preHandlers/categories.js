const Boom = require('@hapi/boom');
const Category = require('../../models/Category');
const Program = require('../../models/Program');

exports.checkCategoryNameExists = async (req) => {
  const existingCategoryName = await Category.countDocuments({ name: req.payload.name.toLowerCase() });

  return existingCategoryName ? Boom.conflict() : null;
};

exports.checkCategoryExists = async (req) => {
  const existingCategory = await Category.countDocuments({ _id: req.params._id });

  return !existingCategory ? Boom.notFound() : null;
};

exports.authorizeCategoryDeletion = async (req) => {
  const isUsed = await Program.countDocuments({ categories: req.params._id });

  return isUsed ? Boom.forbidden() : null;
};
