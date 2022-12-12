const Boom = require('@hapi/boom');
const CompanyLinkRequest = require('../models/CompanyLinkRequest');
const UserCompany = require('../models/UserCompany');
const UtilsHelper = require('./utils');

exports.create = async ({ user, company }) => {
  const userCompany = await UserCompany.findOne({ user }, { company: 1 }).lean();

  if (!userCompany) {
    await CompanyLinkRequest.deleteMany({ user });
    await UserCompany.create({ user, company });
  } else if (!UtilsHelper.areObjectIdsEquals(userCompany.company, company)) {
    throw Boom.conflict();
  }
};
