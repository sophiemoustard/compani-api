const moment = require('moment');
const flat = require('flat');
const Boom = require('boom');

const translate = require('../../helpers/translate');
const employees = require('../../models/Ogust/Employee');
const Counter = require('../../models/idNumber');

const _ = require('lodash');

const { language } = translate;

const list = async (req) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    const users = await employees.getEmployees(params);
    if (users.data.status == 'KO') {
      return Boom.badRequest(users.data.message);
      // throw new Error(`Error while getting employees: ${result.data.message}`);
    }
    return {
      message: translate[language].userShowAllFound,
      data: { users: users.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const getById = async (req) => {
  try {
    const params = {
      token: req.headers['x-ogust-token'],
      id_employee: req.params.id
    };
    const user = await employees.getEmployeeById(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(user.data.message);
    } else if (Object.keys(user.data.employee).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userFound,
      data: { user: user.data }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

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
    return Boom.badImplementation();
  }
};

const create = async (req) => {
  try {
    const query = {
      idNumber: { prefix: `SA${moment().format('YYMM')}` },
    };
    const payload = {
      idNumber: { seq: 1 }
    };
    const number = await Counter.findOneAndUpdate(flat(query), { $inc: flat(payload) }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const idNumber = `${number.idNumber.prefix}-${number.idNumber.seq.toString().padStart(3, '0')}`;
    const params = req.payload;
    params.token = req.headers['x-ogust-token'];
    params.number = idNumber;
    const user = await employees.createEmployee(params);
    return {
      message: translate[language].userSaved,
      data: user.data
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  list,
  getById,
  getEmployeeSalaries,
  create,
};
