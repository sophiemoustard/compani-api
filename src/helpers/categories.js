const Category = require('../models/Category');

exports.create = payload => (new Category(payload)).save();

exports.list = async () => Category.find().lean();

exports.update = async (categoryId, payload) => Category.updateOne({ _id: categoryId }, { $set: payload });

exports.delete = async categoryId => Category.deleteOne({ _id: categoryId });
