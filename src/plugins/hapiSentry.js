const pick = require('lodash/pick');

const beforeSendHandler = (event) => {
  const { user } = event;
  const payload = {};
  if (user) {
    payload.id = user._id;
    payload.email = user.email;
    if (user.company) payload.company = pick(user.company, ['_id', 'name']);
    if (event.user.identity) payload.identity = pick(user.identity, ['firstname', 'lastname']);

    return { ...event, user: payload };
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
