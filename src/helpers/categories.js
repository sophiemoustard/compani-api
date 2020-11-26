const Category = require('../models/Category');

exports.create = payload => (new Category(payload)).save();

exports.list = async () => Category.find().lean();
