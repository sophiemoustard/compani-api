const Ogust = require('../../config/config').Ogust;
const axios = require('axios');
const crypto = require('crypto');
const moment = require('moment-timezone');

/*
** Get token from Ogust base
** Method: POST
*/
exports.getToken = async () => {
  const payload = {
    key: process.env.OGUST_PUBLIC_KEY,
    request: 'GET_TOKEN',
    time: `${moment().tz('Europe/Paris').format('YYYYMMDDHHmmss')}.${Math.floor(Math.random() * ((999999 - 100000) + 1)) + 100000}`,
  };
  const joinPayload = `${payload.key}+${payload.request}+${payload.time}`;
  const hash = crypto.createHmac('sha1', process.env.OGUST_PRIVATE_KEY).update(joinPayload).digest('hex');
  payload.api_signature = hash.toUpperCase();
  const res = await axios.post(`${Ogust.API_LINK}getToken`, payload);
  if (res.data.status == 'KO') {
    throw new Error(`Error while getting new token from Ogust: ${res.data.message}`);
  }
  const currentDate = moment().tz('Europe/Paris');
  res.data.expireDate = currentDate.add(10, 'm').format();
  return res;
};
