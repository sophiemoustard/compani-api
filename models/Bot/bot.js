const axios = require('axios');

exports.redirectToBot = async data => axios.post(`${process.env.BOT_HOSTNAME}/sendMessageToUser`, data);
