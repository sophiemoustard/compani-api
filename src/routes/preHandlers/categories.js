const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async req => (
  await Category.countDocuments({ name: req.payload.name.toLowerCase() })
    ? Boom.conflict()
    : null
);

exports.checkCategoryExists = async req => (
  await Category.findOne({ _id: req.params._id }).lean()
    ? null
    : Boom.notFound()
);
