const UserCompaniesHelper = require('../helpers/userCompanies');
const translate = require('../helpers/translate');

const { language } = translate;

const update = async (req) => {
  await UserCompaniesHelper.update(req.params._id, req.payload);

  return { message: translate[language].userCompaniesUpdated };
};

module.exports = { update };
