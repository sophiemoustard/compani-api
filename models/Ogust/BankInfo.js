const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.setBankInfoById = async payload => axios.post(`${Ogust.API_LINK}setBankinfo`, payload);

exports.getBankInfoById = async payload => axios.post(`${Ogust.API_LINK}searchBankinfo`, payload);
