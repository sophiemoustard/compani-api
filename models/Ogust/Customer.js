const { Ogust } = require('../../config/config');
const axios = require('axios');

const { getIntervalInRange } = require('../../helpers/utils');

// Get a customer by customer id
exports.getCustomerById = async params => axios.post(`${Ogust.API_LINK}getCustomer`, params);
