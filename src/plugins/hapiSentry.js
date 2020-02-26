const beforeSendHandler = (event) => {
  const { user } = event;
  const payload = {};
  if (user) {
    payload.id = user._id;
    payload.email = user.email;
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
