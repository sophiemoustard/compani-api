const Boom = require('boom');

const translate = require('../../helpers/translate');
const employees = require('../../models/Ogust/Employee');

const { language } = translate;

const getEmployeeSalaries = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.id_employee = req.params.id;
    const salariesRaw = await employees.getSalaries(params);
    if (salariesRaw.data.status == 'KO') {
      return Boom.badRequest(salariesRaw.data.message);
    } else if (Object.keys(salariesRaw.data.array_salary.result).length === 0) {
      return Boom.notFound(translate[language].salariesNotFound);
    }
    return {
      message: translate[language].salariesFound,
      data: { salaries: salariesRaw.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation(e);
  }
};

module.exports = {
  getEmployeeSalaries,
};
