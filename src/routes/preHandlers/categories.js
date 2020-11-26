const Boom = require('@hapi/boom');
const Category = require('../../models/Category');

exports.checkCategoryNameExists = async req => (await Category.findOne({ name: req.payload.name.toLowerCase() })
  ? Boom.conflict()
  : null
);
