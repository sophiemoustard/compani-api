const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const app = require('../../server');
const User = require('../../src/models/User');
const Course = require('../../src/models/Course');
const CourseSmsHistory = require('../../src/models/CourseSmsHistory');
const { AUXILIARY, CONVOCATION } = require('../../src/helpers/constants');
const { populateDB, coursesList, programsList, auxiliary, trainee, trainer } = require('./seed/coursesSeed');
const { getToken, authCompany, otherCompany, getTokenByCredentials } = require('./seed/authenticationSeed');
const TwilioHelper = require('../../src/helpers/twilio');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSES ROUTES - POST /courses', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should create intra course', async () => {
      const payload = { name: 'course', type: 'intra', company: authCompany._id, program: programsList[0]._id };
      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should create inter_b2b course', async () => {
      const payload = { name: 'course', type: 'inter_b2b', program: programsList[0]._id };
      const response = await app.inject({
        method: 'POST',
        url: '/courses',
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    const missingParams = [
      { path: 'name' },
      { path: 'company' },
      { path: 'program' },
      { path: 'type' },
    ];
    const payload = { name: 'course', type: 'intra', company: authCompany._id, program: programsList[0]._id };
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          payload: omit({ ...payload }, test.path),
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = { name: 'course', type: 'intra', company: authCompany._id, program: programsList[0]._id };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get all courses', async () => {
      const coursesNumber = coursesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/courses',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(coursesNumber);
    });

    it('should get courses with a specific trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses?trainer=${trainer._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.courses.length).toEqual(2);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/courses',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get course', async () => {
      const courseId = coursesList[0]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course._id).toEqual(courseId);
    });
  });

  it('should get course even if not authenticate', async () => {
    const courseId = coursesList[0]._id;
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${courseId.toHexString()}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.course._id).toEqual(courseId);
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 200 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    it('should return 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const courseId = coursesList[2]._id;
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const courseId = coursesList[1]._id;
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - PUT /courses/{_id}', () => {
  let token;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should update course', async () => {
      const payload = {
        name: 'new name',
        trainer: new ObjectID(),
        referent: { name: 'name new referent', email: 'test@toto.aa', phone: '0777228811' },
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[0]._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const course = await Course.findOne({ _id: coursesList[0]._id }).lean();

      expect(course.name).toEqual(payload.name);
      expect(course.trainer).toEqual(payload.trainer);
      expect(course.referent).toEqual(payload.referent);
    });

    it('should return 400 error if referent phone number is invalid', async () => {
      const payload = {
        referent: { phone: '07772211' },
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[0]._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    it('should return 200 as user is course trainer', async () => {
      const payload = { name: 'new name' };
      token = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[0]._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = { name: 'new name' };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${coursesList[1]._id}`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/sms', () => {
  let authToken;
  let TwilioHelperStub;
  const payload = { body: 'Ceci est un test', type: CONVOCATION };

  beforeEach(populateDB);

  beforeEach(async () => {
    authToken = await getToken('vendor_admin');
    TwilioHelperStub = sinon.stub(TwilioHelper, 'send');
  });
  afterEach(() => {
    TwilioHelperStub.restore();
  });

  it('should send a SMS to user from compani', async () => {
    const smsHistoryBefore = await CourseSmsHistory.countDocuments({ course: coursesList[2]._id }).lean();
    TwilioHelperStub.returns('SMS SENT !');
    const response = await app.inject({
      method: 'POST',
      url: `/courses/${coursesList[2]._id}/sms`,
      payload,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.message).toBe('SMS bien envoyé.');
    const smsHistoryAfter = await CourseSmsHistory.countDocuments({ course: coursesList[2]._id }).lean();
    expect(smsHistoryAfter).toEqual(smsHistoryBefore + 1);
    sinon.assert.calledWithExactly(
      TwilioHelperStub,
      { to: `+33${trainee.contact.phone.substring(1)}`, from: 'Compani', body: payload.body }
    );
  });

  it('should return a 400 error if type is invalid', async () => {
    TwilioHelperStub.returns('SMS SENT !');
    const response = await app.inject({
      method: 'POST',
      url: `/courses/${coursesList[2]._id}/sms`,
      payload: { ...payload, type: 'qwert' },
      headers: { 'x-access-token': authToken },
    });
    expect(response.statusCode).toBe(400);
    sinon.assert.notCalled(TwilioHelperStub);
  });

  const missingParams = ['body', 'type'];
  missingParams.forEach((param) => {
    it(`should return a 400 error if missing ${param} parameter`, async () => {
      TwilioHelperStub.returns('SMS SENT !');
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[2]._id}/sms`,
        payload: omit(payload, param),
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(400);
      sinon.assert.notCalled(TwilioHelperStub);
    });
  });

  const roles = [
    { name: 'coach', expectedCode: 403 },
    { name: 'auxiliary', expectedCode: 403 },
    { name: 'auxiliary_without_company', expectedCode: 403 },
    { name: 'helper', expectedCode: 403 },
    { name: 'client_admin', expectedCode: 403 },
    { name: 'training_organisation_manager', expectedCode: 200 },
    { name: 'trainer', expectedCode: 403 },
  ];

  it('should return 200 as user is course trainer', async () => {
    TwilioHelperStub.returns('SMS SENT !');
    authToken = await getTokenByCredentials(trainer.local);
    const response = await app.inject({
      method: 'POST',
      url: `/courses/${coursesList[2]._id}/sms`,
      headers: { 'x-access-token': authToken },
      payload,
    });

    expect(response.statusCode).toBe(200);
  });

  roles.forEach((role) => {
    it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
      TwilioHelperStub.returns('SMS SENT !');
      authToken = await getToken(role.name);
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[2]._id}/sms`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(role.expectedCode);
    });
  });
});

describe('COURSES ROUTES - GET /courses/{_id}/sms', () => {
  let authToken;

  beforeEach(populateDB);

  beforeEach(async () => {
    authToken = await getToken('vendor_admin');
  });

  it('should get SMS from course', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${coursesList[0]._id}/sms`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
    expect(response.result.data.sms).toHaveLength(1);
    expect(response.result.data.sms.every(sms => sms.course.toHexString() === coursesList[0]._id.toHexString()))
      .toBeTruthy();
  });

  const roles = [
    { name: 'coach', expectedCode: 403 },
    { name: 'auxiliary', expectedCode: 403 },
    { name: 'auxiliary_without_company', expectedCode: 403 },
    { name: 'helper', expectedCode: 403 },
    { name: 'client_admin', expectedCode: 403 },
    { name: 'training_organisation_manager', expectedCode: 200 },
    { name: 'trainer', expectedCode: 403 },
  ];

  it('should return a 200 as user is course trainer', async () => {
    authToken = await getTokenByCredentials(trainer.local);
    const response = await app.inject({
      method: 'GET',
      url: `/courses/${coursesList[0]._id}/sms`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);
  });

  roles.forEach((role) => {
    it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
      authToken = await getToken(role.name);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${coursesList[0]._id}/sms`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(role.expectedCode);
    });
  });
});

describe('COURSES ROUTES - POST /courses/{_id}/trainee', () => {
  let token;
  const payload = {
    identity: { firstname: 'Coco', lastname: 'Bongo' },
    local: { email: 'coco_bongo@alenvi.io' },
    contact: { phone: '0689320234' },
    company: authCompany._id,
  };

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      token = await getToken('vendor_admin');
    });

    it('should add existing user to course trainees', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/trainees`,
        headers: { 'x-access-token': token },
        payload: pick(auxiliary, ['identity', 'local.email', 'contact', 'company']),
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([auxiliary._id]));
    });

    it('should add new user to course trainees', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/trainees`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const newUser = await User.findOne({ 'local.email': payload.local.email }).lean({ autopopulate: true });
      expect(newUser).toBeDefined();
      expect(newUser.role).toBeUndefined();
      expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([newUser._id]));
    });

    it('should return a 409 error if user exists but not from same company as in payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[1]._id}/trainees`,
        headers: { 'x-access-token': token },
        payload: { ...pick(auxiliary, ['identity', 'local.email', 'contact']), company: otherCompany._id },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 409 error as user "trainee" exists and is already registered to course', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[2]._id}/trainees`,
        headers: { 'x-access-token': token },
        payload: { ...pick(trainee, ['local.email', 'company']), identity: { lastname: 'same_trainee' } },
      });

      expect(response.statusCode).toBe(409);
    });

    const missingParams = ['local.email', 'identity.lastname', 'company'];
    missingParams.forEach((path) => {
      it(`should return a 400 error if missing '${path}' parameter`, async () => {
        const falsyPayload = omit(payload, path);
        const response = await app.inject({
          method: 'POST',
          url: '/courses',
          payload: falsyPayload,
          headers: { 'x-access-token': token },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });


  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    it('should return a 200 as user is course trainer', async () => {
      token = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/trainees`,
        headers: { 'x-access-token': token },
        payload: pick(auxiliary, ['identity', 'local.email', 'contact', 'company']),
      });

      expect(response.statusCode).toBe(200);
    });

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/courses/${coursesList[0]._id}/trainees`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSES ROUTES - DELETE /courses/{_id}/trainees/{traineeId}', () => {
  let authToken = null;
  const courseId = coursesList[2]._id;
  const traineeId = trainee._id;

  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete course trainee', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseId.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const course = await Course.findById(courseId).lean();
      expect(course.trainees).toHaveLength(0);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    it('should return 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'DELETE',
        url: `/courses/${courseId.toHexString()}/trainees/${traineeId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/courses/${courseId.toHexString()}/trainees/${traineeId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSE ROUTES - GET /:_id/attendance-sheets', () => {
  let authToken = null;
  const courseId = coursesList[2]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseId}/attendance-sheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/attendance-sheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    it('should return 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseId}/attendance-sheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseId}/attendance-sheets`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSE ROUTES - GET /:_id/completion-certificates', () => {
  let authToken = null;
  const courseId = coursesList[2]._id;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseId}/completion-certificates`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/completion-certificates`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    it('should return 200 as user is course trainer', async () => {
      authToken = await getTokenByCredentials(trainer.local);
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${courseId}/completion-certificates`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseId}/completion-certificates`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
