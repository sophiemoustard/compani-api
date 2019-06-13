const { Ogust } = require('../../config/config');
const axios = require('axios');

// Get salaries by employee id
exports.getSalaries = async payload => axios.post(`${Ogust.API_LINK}searchSalary`, payload);
