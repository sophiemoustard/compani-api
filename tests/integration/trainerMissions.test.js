const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const app = require('../../server');
const TrainerMission = require('../../src/models/TrainerMission');
const { trainer, coach } = require('../seed/authUsersSeed');
const { populateDB, courseList } = require('./seed/trainerMissionsSeed');
const { getToken } = require('./helpers/authentication');
const { generateFormData, getStream } = require('./utils');
const { CompaniDate } = require('../../src/helpers/dates/companiDates');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const { DAY } = require('../../src/helpers/constants');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TRAINING CONTRACTS ROUTES - POST /trainermissions', () => {
  let authToken;
  let uploadCourseFileStub;

  beforeEach(async () => {
    await populateDB();
    uploadCourseFileStub = sinon.stub(GCloudStorageHelper, 'uploadCourseFile')
      .returns({ publicId: '123', link: 'ceciestunlien' });
  });
  afterEach(() => {
    uploadCourseFileStub.restore();
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should upload trainer mission for a single course', async () => {
      const formData = {
        courses: courseList[0]._id.toHexString(),
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'ceciestunautrelien' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(200);
      const trainerMissionCount = await TrainerMission.countDocuments({
        courses: [courseList[0]._id],
        date: CompaniDate().startOf(DAY).toISO(),
        trainer: trainer._id,
        fee: 1200,
        file: { publicId: '1234567890', link: 'ceciestunautrelien' },
      });
      expect(trainerMissionCount).toBe(1);
    });

    it('should upload trainer mission for several courses', async () => {
      const courses = [courseList[0]._id.toHexString(), courseList[1]._id.toHexString()];
      const formData = {
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);
      courses.forEach(course => form.append('courses', course));

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'ceciestunautrelien' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(200);
      const trainerMissionCount = await TrainerMission.countDocuments({
        courses: [courseList[0]._id, courseList[1]],
        date: CompaniDate().startOf(DAY).toISO(),
        trainer: trainer._id,
        fee: 1200,
        file: { publicId: '1234567890', link: 'ceciestunautrelien' },
      });
      expect(trainerMissionCount).toBe(1);
    });

    it('should return 400 if course is string', async () => {
      const formData = {
        courses: '12345',
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if course is empty array', async () => {
      const courses = [];
      const formData = {
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);
      courses.forEach(course => form.append('courses', course));

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if course not found', async () => {
      const courses = [courseList[0]._id.toHexString(), courseList[1]._id.toHexString(), new ObjectId().toHexString()];
      const formData = {
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);
      courses.forEach(course => form.append('courses', course));

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if wrong trainer', async () => {
      const courses = [courseList[0]._id.toHexString(), courseList[2]._id.toHexString()];
      const formData = {
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);
      courses.forEach(course => form.append('courses', course));

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 409 if course already have a trainer mission', async () => {
      const courses = [courseList[0]._id.toHexString(), courseList[3]._id.toHexString()];
      const formData = {
        trainer: trainer._id.toHexString(),
        file: 'test',
        fee: 1200,
      };
      const form = generateFormData(formData);
      courses.forEach(course => form.append('courses', course));

      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainermissions',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: getStream(form),
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const courses = [courseList[0]._id.toHexString(), courseList[1]._id.toHexString()];
        const formData = {
          trainer: trainer._id.toHexString(),
          file: 'test',
          fee: 1200,
        };

        const form = generateFormData(formData);
        courses.forEach(course => form.append('courses', course));

        uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

        const response = await app.inject({
          method: 'POST',
          url: '/trainermissions',
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
          payload: getStream(form),
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('TRAINING CONTRACTS ROUTES - GET /trainermissions', () => {
  let authToken;

  beforeEach(async () => {
    await populateDB();
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should get trainer missions for a trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/trainermissions?trainer=${trainer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.trainerMissions.length).toEqual(1);
    });

    it('should return 404 if user doesn\'t exist as trainer', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/trainermissions?trainer=${coach._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/trainermissions?trainer=${trainer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
