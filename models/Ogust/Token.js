const Ogust = require('../../config/config').Ogust;
const rp = require('request-promise');
const crypto = require('crypto');
const moment = require('moment-timezone');

/* ********* AUTHENTIFICATION ********* */

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
  const res = await rp.post({
    uri: `${Ogust.API_LINK}getToken`,
    body: payload,
    json: true,
    resolveWithFullResponse: true,
    time: true,
  });
  if (res.body.status == 'KO') {
    throw new Error(`Error while getting new token from Ogust: ${res.body.message}`);
  }
  const currentDate = moment().tz('Europe/Paris');
  res.body.expireDate = currentDate.add(10, 'm').format();
  return res;
};
