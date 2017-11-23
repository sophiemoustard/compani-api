const Ogust = require('../../config/config').Ogust;
const rp = require('request-promise');

exports.getList = async (params) => {
  const options = {
    url: `${Ogust.API_LINK}getList`,
    json: true,
    body: params,
    resolveWithFullResponse: true,
    time: true
  };
  const res = await rp.post(options);
  return res;
};
