const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.setSepaInfo = async payload => axios.post(`${Ogust.API_LINK}setSepainfo`, payload);

exports.getSepaInfo = async payload => axios.post(`${Ogust.API_LINK}searchSepainfo`, payload);
