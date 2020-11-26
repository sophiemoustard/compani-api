const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async (req) => {
  const existingCourse = await Category.countDocuments({ name: req.payload.name.toLowerCase() });

  return existingCourse ? Boom.conflict() : null;
};

exports.authorizeCategoryUpdate = async (req) => {
  const category = await Category.findOne({ _id: req.params._id }).lean();
  if (!category) throw Boom.notFound();
  return this.checkCategoryNameExists(req);
};
