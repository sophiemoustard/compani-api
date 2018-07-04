const Ogust = require('../../config/config').Ogust;
const axios = require('axios');

// Get List
exports.getList = async payload => axios.post(`${Ogust.API_LINK}getList`, payload);
