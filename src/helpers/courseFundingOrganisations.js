const CourseFundingOrganisation = require('../models/CourseFundingOrganisation');

exports.list = async () => CourseFundingOrganisation.find().lean();

exports.create = async payload => (new CourseFundingOrganisation(payload)).save();
