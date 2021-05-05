const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const { BLENDED_COURSE_REGISTRATION } = require('../../../src/helpers/constants');
const NotificationHelper = require('../../../src/helpers/notifications');
const ExpoNotification = require('../../../src/models/ExpoNotification');

describe('sendNotificationToUser', () => {
  let sendNotificationToUser;
  beforeEach(() => {
    sendNotificationToUser = sinon.stub(ExpoNotification, 'sendNotificationToUser');
  });
  afterEach(() => {
    sendNotificationToUser.restore();
  });

  it('should call expo api to send notification', async () => {
    const courseId = new ObjectID();
    const payload = {
      title: 'Bonjour, c\'est Philippe Etchebest',
      body: '#TeamMathias',
      data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
    };

    await NotificationHelper.sendNotificationToUser(payload);

    sinon.assert.calledOnceWithExactly(
      sendNotificationToUser,
      {
        to: 'ExponentPushToken[_UgI-UCZhBhcmvII74H3U2]',
        title: 'Bonjour, c\'est Philippe Etchebest',
        body: '#TeamMathias',
        data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
      }
    );
  });
});
