const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.getEmploymentContracts = async payload => axios.post(`${Ogust.API_LINK}searchEmployment`, payload);
exports.createEmploymentContract = async payload => axios.post(`${Ogust.API_LINK}setEmployment`, payload);
