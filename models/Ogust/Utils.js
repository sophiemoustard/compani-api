const { Ogust } = require('../../config/config');
const axios = require('axios');

// Get List
exports.getList = async payload => axios.post(`${Ogust.API_LINK}getList`, payload);
