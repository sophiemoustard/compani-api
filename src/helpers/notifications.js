const ExpoNotification = require('../models/ExpoNotification');

exports.sendNotificationToUser = (payload) => {
  const expoPayload = {
    to: 'ExponentPushToken[_UgI-UCZhBhcmvII74H3U2]',
    title: payload.title,
    body: payload.body,
    data: payload.data,
  };
  ExpoNotification.sendNotificationToUser(expoPayload);
};
