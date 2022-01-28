const CourseFundingOrganisation = require('../models/CourseFundingOrganisation');

exports.list = async () => CourseFundingOrganisation.find().lean();

exports.create = async payload => CourseFundingOrganisation.create(payload);
