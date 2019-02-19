const axios = require('axios');

exports.getDirectionInfo = async query => axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', { params: query });
