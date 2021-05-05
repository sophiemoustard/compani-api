const axios = require('axios');

const EXPO_NOTIFICATION_API_URL = 'https://exp.host/--/api/v2/push/send/';

exports.sendNotificationToUser = async payload => axios.post(`${EXPO_NOTIFICATION_API_URL}`, payload);
