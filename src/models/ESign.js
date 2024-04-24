const axios = require('axios');

const EVERSIGN_API_URL = 'https://api.eversign.com/api/';
const EVERSIGN_PARAMS = {
  access_key: process.env.EVERSIGN_API_KEY,
  business_id: process.env.EVERSIGN_BUSINESS_ID,
};

exports.getDocument = async (docId) => {
  EVERSIGN_PARAMS.document_hash = docId;
  return axios.get(`${EVERSIGN_API_URL}document`, { params: EVERSIGN_PARAMS });
};
