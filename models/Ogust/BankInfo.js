const Ogust = require('../../config/config').Ogust;
const axios = require('axios');

exports.setBankInfoByEmployeeId = async payload => axios.post(`${Ogust.API_LINK}setBankinfo`, payload);

exports.getBankInfoById = async payload => axios.post(`${Ogust.API_LINK}searchBankinfo`, payload);
