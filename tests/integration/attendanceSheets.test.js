const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const { ObjectID } = require('mongodb');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const app = require('../../server');
const {
  populateDB,
  coursesList,
} = require('./seed/attendanceSheetsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');
const Course = require('../../src/models/Course');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('POST /attendancesheets', () => {
  let authToken = null;
  let uploadCourseFile;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
      uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    });
    afterEach(() => {
      uploadCourseFile.restore();
    });

    it('should upload attendance sheet to intra course', async () => {
      const formData = {
        course: coursesList[0]._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        date: new Date('2020-01-23').toISOString(),
      };

      const form = generateFormData(formData);
      const attendanceSheetsLengthBefore = coursesList[0].attendanceSheets.length;
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const updatedCourse = await Course.findOne({ _id: coursesList[0]._id }, { attendanceSheets: 1 });
      const attendanceSheetsLengthAfter = updatedCourse.attendanceSheets.length;
      expect(attendanceSheetsLengthAfter).toBe(attendanceSheetsLengthBefore + 1);
      sinon.assert.calledOnce(uploadCourseFile);
    });

    it('should upload attendance sheet to inter course', async () => {
      const formData = {
        course: coursesList[1]._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        trainee: coursesList[1].trainees[0].toHexString(),
      };

      const form = generateFormData(formData);
      const attendanceSheetsLengthBefore = coursesList[1].attendanceSheets.length;
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const updatedCourse = await Course.findOne({ _id: coursesList[1]._id }, { attendanceSheets: 1 });
      const attendanceSheetsLengthAfter = updatedCourse.attendanceSheets.length;
      expect(attendanceSheetsLengthAfter).toBe(attendanceSheetsLengthBefore + 1);
      sinon.assert.calledOnce(uploadCourseFile);
    });

    it('should return 400 trying to pass trainee for intra course', async () => {
      const formData = {
        course: coursesList[0]._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        trainee: coursesList[0].trainees[0]._id.toHexString(),
      };

      const form = generateFormData(formData);
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 trying to pass date for inter course', async () => {
      const formData = {
        course: coursesList[1]._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        date: new Date('2020-01-23').toISOString(),
      };

      const form = generateFormData(formData);
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 trying to pass unknowned trainee', async () => {
      const formData = {
        course: coursesList[1]._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        trainee: new ObjectID().toHexString(),
      };

      const form = generateFormData(formData);
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 trying to pass date outside course dates', async () => {
      const formData = {
        course: coursesList[0]._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        date: new Date('2018-01-23').toISOString(),
      };

      const form = generateFormData(formData);
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});

describe('ATTENDANCE SHEETS ROUTES - GET /attendancesheets', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get course\'s attendance sheets', async () => {
      const attendanceSheetsNumber = coursesList[0].attendanceSheets.length;
      const response = await app.inject({
        method: 'GET',
        url: `/attendancesheets?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.attendanceSheets.length).toEqual(attendanceSheetsNumber);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/attendancesheets?course=${coursesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
