const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async (req) => {
  if (req.payload) {
    const existingCourse = await Category.countDocuments({ name: req.payload.name.toLowerCase() });
    return existingCourse ? Boom.conflict() : null;
  }
  return null;
};

exports.checkCategoryExists = async (req) => {
  const category = await Category.findOne({ _id: req.params._id }).lean();
  if (!category) throw Boom.notFound();

  return this.checkCategoryNameExists(req);
};
