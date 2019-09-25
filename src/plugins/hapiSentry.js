const pick = require('lodash/pick');

const beforeSendHandler = (event) => {
  if (event.user) {
    if (event.user.company) event.user.company = { _id: event.user.company._id.toHexString(), name: event.user.company.name };
    if (event.user.identity) event.user.identity = pick(event.user.identity, ['firstname', 'lastname']);
    if (event.user.scope) delete event.user.scope;
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
