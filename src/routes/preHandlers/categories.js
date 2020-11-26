const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async (req) => {
  const existingCourse = await Category.countDocuments({ name: req.payload.name.toLowerCase() });

  return existingCourse ? Boom.conflict() : null;
};
