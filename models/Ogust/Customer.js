const { Ogust } = require('../../config/config');
const axios = require('axios');

const { getIntervalInRange } = require('../../helpers/utils');

// Get customers
exports.getCustomers = async params => axios.post(`${Ogust.API_LINK}searchCustomer`, params);

// Get a customer by customer id
exports.getCustomerById = async params => axios.post(`${Ogust.API_LINK}getCustomer`, params);

// Edit customer by id
exports.editCustomerById = async params => axios.post(`${Ogust.API_LINK}setCustomer`, params);
