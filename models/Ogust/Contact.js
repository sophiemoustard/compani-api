const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.getContacts = async params => axios.post(`${Ogust.API_LINK}searchContact`, params);

exports.editContactById = async params => axios.post(`${Ogust.API_LINK}setContact`, params);
