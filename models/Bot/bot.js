const rp = require('request-promise');

exports.redirectToBot = async (queryAdress) => {
  const address = encodeURIComponent(queryAdress);
  const url = `${process.env.BOT_HOSTNAME}/editCustomerDone?address=${address}`;
  const options = {
    url,
    resolveWithFullResponse: true,
    time: true,
  };
  await rp.get(options);
};
