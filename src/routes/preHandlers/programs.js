const Boom = require('@hapi/boom');
const get = require('lodash/get');
const Program = require('../../models/Program');
const Category = require('../../models/Category');

exports.checkProgramExists = async (req) => {
  const program = await Program.countDocuments({ _id: req.params._id });
  if (!program) throw Boom.notFound();

  return null;
};

exports.getProgramImagePublicId = async (req) => {
  const program = await Program.findOne({ _id: req.params._id }).lean();
  if (!program) throw Boom.notFound();

  return get(program, 'image.publicId') || '';
};

exports.checkCategoryExists = async (req) => {
  let categoryId = get(req, 'payload.categories[0]');
  if (!categoryId) categoryId = get(req, 'payload.categoryId');
  const category = await Category.countDocuments({ _id: categoryId });

  if (!category) throw Boom.notFound();
  return null;
};
