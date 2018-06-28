const moment = require('moment');
const flat = require('flat');
const Boom = require('boom');
const axios = require('axios');

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
    if (users.body.status == 'KO') {
      return Boom.badRequest({ message: users.body.message });
      // throw new Error(`Error while getting employees: ${result.body.message}`);
    } else if (Object.keys(users.body.array_employee.result).length === 0) {
      return Boom.notFound();
    }
    return {
      message: translate[language].userShowAllFound,
      data: { users: users.body }
    };
  } catch (e) {
    req.log('error', e);
    Boom.badImplementation();
  }
};

module.exports = {
  list, // getById, getAllBySector, getEmployeeServices, getEmployeeCustomers, getEmployeeSalaries, create, updateById
};
