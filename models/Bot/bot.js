const rp = require('request-promise');

exports.redirectToBot = async (address, message) => {
  // const address = encodeURIComponent(queryAdress);
  const url = `${process.env.BOT_HOSTNAME}/sendMessageToUser`;
  const options = {
    url,
    body: {
      address,
      message
    },
    json: true,
    resolveWithFullResponse: true,
    time: true
  };
  const res = await rp.post(options);
  return res;
};
