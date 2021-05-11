const axios = require('axios');
const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const { BLENDED_COURSE_REGISTRATION } = require('../../../src/helpers/constants');
const NotificationHelper = require('../../../src/helpers/notifications');
const Course = require('../../../src/models/Course');
const SinonMongoose = require('../sinonMongoose');

describe('sendNotificationToAPI', () => {
  let post;
  beforeEach(() => {
    post = sinon.stub(axios, 'post');
  });
  afterEach(() => {
    post.restore();
  });

  it('should call expo api', async () => {
    const EXPO_NOTIFICATION_API_URL = 'https://exp.host/--/api/v2/push/send/';
    const courseId = new ObjectID();
    const payload = {
      to: 'ExponentPushToken[JeSuisUnTokenExpo]',
      title: 'Bonjour, c\'est Philippe Etchebest',
      body: '#TeamMathias',
      data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
    };

    await NotificationHelper.sendNotificationToAPI(payload);

    sinon.assert.calledOnceWithExactly(
      post,
      `${EXPO_NOTIFICATION_API_URL}`,
      {
        to: 'ExponentPushToken[JeSuisUnTokenExpo]',
        title: 'Bonjour, c\'est Philippe Etchebest',
        body: '#TeamMathias',
        data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
      }
    );
  });
});

describe('sendNotificationToUser', () => {
  let sendNotificationToAPI;
  beforeEach(() => {
    sendNotificationToAPI = sinon.stub(NotificationHelper, 'sendNotificationToAPI');
  });
  afterEach(() => {
    sendNotificationToAPI.restore();
  });

  it('should call expo api to send notification', async () => {
    const courseId = new ObjectID();
    const payload = {
      title: 'Bonjour, c\'est Philippe Etchebest',
      body: '#TeamMathias',
      data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
      expoToken: 'ExponentPushToken[JeSuisUnTokenExpo]',
    };

    await NotificationHelper.sendNotificationToUser(payload);

    sinon.assert.calledOnceWithExactly(
      sendNotificationToAPI,
      {
        to: 'ExponentPushToken[JeSuisUnTokenExpo]',
        title: 'Bonjour, c\'est Philippe Etchebest',
        body: '#TeamMathias',
        data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
      }
    );
  });
});

describe('sendBlendedCourseRegistrationNotification', () => {
  let sendNotificationToUser;
  let findOne;
  beforeEach(() => {
    sendNotificationToUser = sinon.stub(NotificationHelper, 'sendNotificationToUser');
    findOne = sinon.stub(Course, 'findOne');
  });
  afterEach(() => {
    sendNotificationToUser.restore();
    findOne.restore();
  });

  it('should format payload and call sendNotificationToUser', async () => {
    const trainee = {
      formationExpoTokenList: ['ExponentPushToken[jeSuisUnTokenExpo]', 'ExponentPushToken[jeSuisUnAutreTokenExpo]'],
    };
    const courseId = new ObjectID();
    const course = {
      _id: courseId,
      subProgram: { program: { name: 'La communication avec Patrick' } },
      misc: 'skusku',
      slots: [{ startDate: '2020-01-02' }],
    };

    findOne.returns(SinonMongoose.stubChainedQueries([course]));

    await NotificationHelper.sendBlendedCourseRegistrationNotification(trainee, courseId);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    sinon.assert.calledWithExactly(
      sendNotificationToUser.getCall(0),
      {
        title: 'Vous avez été inscrit à une formation',
        body: 'Rendez-vous sur la page "à propos" de votre formation La communication avec Patrick - skusku'
        + ' pour en découvrir le programme.',
        data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
        expoToken: 'ExponentPushToken[jeSuisUnTokenExpo]',
      }
    );
    sinon.assert.calledWithExactly(
      sendNotificationToUser.getCall(1),
      {
        title: 'Vous avez été inscrit à une formation',
        body: 'Rendez-vous sur la page "à propos" de votre formation La communication avec Patrick - skusku'
        + ' pour en découvrir le programme.',
        data: { _id: courseId, type: BLENDED_COURSE_REGISTRATION },
        expoToken: 'ExponentPushToken[jeSuisUnAutreTokenExpo]',
      }
    );
  });

  it('should do nothing if trainee has no formationExpoTokenList', async () => {
    const trainee = {};
    const courseId = new ObjectID();

    await NotificationHelper.sendBlendedCourseRegistrationNotification(trainee, courseId);

    sinon.assert.notCalled(findOne);
    sinon.assert.notCalled(sendNotificationToUser);
  });
});
