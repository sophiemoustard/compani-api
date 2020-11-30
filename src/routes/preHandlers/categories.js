const isEmpty = require('lodash/isEmpty');
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

exports.getCategory = async categoryId => Category.findOne({ _id: categoryId })
  .populate({ path: 'programs', select: '_id' })
  .lean();

exports.checkCategoryIsEmpty = async (req) => {
  const emptyCategory = await this.getCategory(req.params._id);
  return !isEmpty(emptyCategory.programs) ? Boom.forbidden() : null;
};
