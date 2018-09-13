const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.editAddress = async params => axios.post(`${Ogust.API_LINK}setAddress`, params);
