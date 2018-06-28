const moment = require('moment');
const flat = require('flat');
const Boom = require('boom');

const translate = require('../../helpers/translate');
const employees = require('../../models/Ogust/Employee');
const customers = require('../../models/Ogust/Customer');
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
      // throw new Error(`Error while getting employees: ${result.body.message}`);
    } else if (Object.keys(users.data.array_employee.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userShowAllFound,
      data: { users: users.data }
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation();
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
      data: { user: user.body }
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation();
  }
};

const getAllBySector = async (req, res) => {
  try {
    const params = req.query;
    params.token = req.headers['x-ogust-token'];
    params.sector = req.params.sector;
    const users = await employees.getEmployeesBySector(params);
    if (user.data.status == 'KO') {
      return Boom.badRequest(users.data.message);
    } else if (Object.keys(users.body.array_employee.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userShowAllFound,
      data: { users: users.data }
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation();
  }
};

module.exports = {
  list, getById, getAllBySector // getEmployeeServices, getEmployeeCustomers, getEmployeeSalaries, create, updateById
};
