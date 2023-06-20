const UserCompaniesHelper = require('../helpers/userCompanies');
const translate = require('../helpers/translate');

const { language } = translate;

const create = async (req) => {
  await UserCompaniesHelper.create(req.payload);

  return { message: translate[language].userCompanyCreated };
};

const update = async (req) => {
  await UserCompaniesHelper.update(req.params._id, req.payload);

  return { message: translate[language].userCompanyUpdated };
};

module.exports = { create, update };
