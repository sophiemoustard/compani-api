const expect = require('expect');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const app = require('../../server');
const User = require('../../src/models/User');
const Course = require('../../src/models/Course');
const { AUXILIARY } = require('../../src/helpers/constants');
const { populateDB, coursesList, programsList, auxiliary, trainee } = require('./seed/coursesSeed');
const { getToken, authCompany, otherCompany } = require('./seed/authenticationSeed');

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

    it('should create course', async () => {
      const payload = { name: 'course', type: 'intra', companies: [authCompany._id], program: programsList[0]._id };
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
      { path: 'companies' },
      { path: 'program' },
      { path: 'type' },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const payload = { name: 'course', type: 'intra', companies: [authCompany._id], program: programsList[0]._id };
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
        const payload = { name: 'course', type: 'intra', companies: [authCompany._id], program: programsList[0]._id };
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
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
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
      { name: 'trainer', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const courseId = coursesList[0]._id;
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
      const payload = { name: 'new name', trainer: new ObjectID() };
      const response = await app.inject({
        method: 'PUT',
        url: `/courses/${coursesList[0]._id}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(response.statusCode).toBe(200);
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
        const payload = { name: 'new name' };
        token = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/courses/${coursesList[0]._id}`,
          headers: { 'x-access-token': token },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
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
      expect(newUser.role.client.name).toBe(AUXILIARY);
      expect(response.result.data.course.trainees).toEqual(expect.arrayContaining([newUser._id]));
    });

    it('should return a 409 error if user exists but not from same company as new user course', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/courses/${coursesList[0]._id}/trainees`,
        headers: { 'x-access-token': token },
        payload: { ...pick(auxiliary, ['identity', 'local.email', 'contact']), company: otherCompany._id },
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

describe('COURSE ROUTES - GET /:_id/attendancesheets', () => {
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
        url: `/courses/${courseId}/attendancesheets`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if course does not exist', async () => {
      const invalidId = (new ObjectID()).toHexString();
      const response = await app.inject({
        method: 'GET',
        url: `/courses/${invalidId}/attendancesheets`,
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

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/courses/${courseId}/attendancesheets`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
