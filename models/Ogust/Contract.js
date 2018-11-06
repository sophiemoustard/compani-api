const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.listContracts = async params => axios.post(`${Ogust.API_LINK}searchEmployment`, params);
exports.editContractById = async params => axios.post(`${Ogust.API_LINK}setEmployment`, params);
exports.removeContractById = async params => axios.post(`${Ogust.API_LINK}remEmployment`, params);
