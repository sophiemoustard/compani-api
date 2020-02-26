const pick = require('lodash/pick');
const { formatIdentity } = require('../helpers/utils');

const beforeSendHandler = (event) => {
  const { user } = event;
  const payload = {};
  if (user) {
    payload.id = user._id;
    if (user.company) {
      payload.company = { _id: user.company._id, name: user.company.name };
    }
    if (user.identity) payload.identity = formatIdentity(user.identity, 'fl');
    event.user = payload;
  }
  return event;
};

const options = {
  client: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    beforeSend: beforeSendHandler,
  },
};

module.exports = { options };
