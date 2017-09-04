const rp = require('request-promise');

/*
** Get whitelisted domains
** PARAMS:
** - access_token: facebook page token
** Method: GET
*/
exports.getWhitelistedDomains = async (access_token) => {
  const options = {
    url: 'https://graph.facebook.com/v2.6/me/messenger_profile',
    json: true,
    qs: { fields: 'whitelisted_domains', access_token },
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.get(options);
  return result;
};

/*
** Post whitelisted domains
** PARAMS:
** - access_token: facebook page token
** Method: GET
*/
exports.postWhitelistedDomains = async (access_token, whitelisted_domains) => {
  const options = {
    url: 'https://graph.facebook.com/v2.6/me/messenger_profile',
    json: true,
    qs: { access_token },
    body: {
      whitelisted_domains
    },
    resolveWithFullResponse: true,
    time: true,
  };
  const result = await rp.post(options);
  return result;
};
