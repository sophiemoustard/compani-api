const Boom = require('@hapi/boom');
const CompanyLinkRequest = require('../models/CompanyLinkRequest');
const UserCompany = require('../models/UserCompany');
const UtilsHelper = require('./utils');
const { DAY } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');

/* payload = { user, company, startDate? } */
exports.create = async (payload) => {
  const { user, company } = payload;
  const userCompany = await UserCompany.findOne({ user }, { company: 1 }).lean();

  if (!userCompany) {
    await CompanyLinkRequest.deleteMany({ user });
    await UserCompany.create(payload);
  } else if (!UtilsHelper.areObjectIdsEquals(userCompany.company, company)) {
    throw Boom.conflict();
  }
};

exports.update = async (userCompany, payload) =>
  UserCompany.updateOne(
    { _id: userCompany },
    { $set: { ...payload, endDate: CompaniDate(payload.endDate).endOf(DAY).toISO() } }
  );
