const ExpoNotification = require('../models/ExpoNotification');

exports.sendNotificationToUser = (payload) => {
  const expoPayload = { to: payload.expoToken, title: payload.title, body: payload.body, data: payload.data };
  ExpoNotification.sendNotificationToUser(expoPayload);
};
