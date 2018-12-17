const axios = require('axios');

exports.createDocument = async data => axios.post('https://api.eversign.com/api/document', data, {
  params: {
    access_key: process.env.EVERSIGN_API_KEY,
    business_id: process.env.EVERSIGN_BUSINESS_ID
  }
});
