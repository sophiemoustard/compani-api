const Boom = require('@hapi/boom');
const UserCompany = require('../models/UserCompany');
const UtilsHelper = require('./utils');

exports.create = async (user, company) => {
  const userCompany = await UserCompany.findOne({ user, company }).lean();

  if (!userCompany) await UserCompany.create({ user, company });
  else if (!UtilsHelper.areObjectIdsEquals(userCompany.company, company)) throw Boom.conflict();
};
