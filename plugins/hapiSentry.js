const pick = require('lodash/pick');

const beforeSendHandler = (event) => {
  if (event.user) {
    if (event.user.company) event.user.company = pick(event.user.company, ['_id', 'name']);
    if (event.user.scope) delete event.user.scope;
  }
  return event;
};

const options = {
  client: {
    dsn: process.env.SENTRY_DSN,
    environment: 'development',
    beforeSend: beforeSendHandler,
    beforeBreadcrumb(event) {
      console.log('event', event);
    }
  },
};

module.exports = { options };
