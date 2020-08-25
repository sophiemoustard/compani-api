const axios = require('axios');

exports.getDistanceMatrix = async query => axios.get(
  'https://maps.googleapis.com/maps/api/distancematrix/json',
  { params: query }
);
