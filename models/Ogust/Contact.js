const { Ogust } = require('../../config/config');
const axios = require('axios');

exports.getContacts = async params => axios.post(`${Ogust.API_LINK}searchContact`, params);

exports.setContact = async params => axios.post(`${Ogust.API_LINK}setContact`, params);
