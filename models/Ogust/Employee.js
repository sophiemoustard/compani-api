const { Ogust } = require('../../config/config');
const axios = require('axios');

const { getIntervalInRange } = require('../../helpers/utils');

// Get all employees
exports.getEmployees = async payload => axios.post(`${Ogust.API_LINK}searchEmployee`, payload);

// Get an employee by employee id
exports.getEmployeeById = async payload => axios.post(`${Ogust.API_LINK}getEmployee`, payload);

// Get salaries by employee id
exports.getSalaries = async payload => axios.post(`${Ogust.API_LINK}searchSalary`, payload);

// Create employee
exports.createEmployee = async payload => axios.post(`${Ogust.API_LINK}setEmployee`, payload);
