const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const { ObjectID } = require('mongodb');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const app = require('../../server');
const { populateDB, coursesList, attendanceSheetsList } = require('./seed/attendanceSheetsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');
const AttendanceSheet = require('../../src/models/AttendanceSheet');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ATTENDANCESHEETS ROUTES - POST /attendancesheets', () => {
  let authToken = null;
  let uploadCourseFile;
  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
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
      const attendanceSheetsLengthBefore = await AttendanceSheet.countDocuments({ course: coursesList[0]._id });
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const attendanceSheetsLengthAfter = await AttendanceSheet.countDocuments({ course: coursesList[0]._id });
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
      const attendanceSheetsLengthBefore = await AttendanceSheet.countDocuments({ course: coursesList[1]._id });
      uploadCourseFile.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/attendancesheets',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const attendanceSheetsLengthAfter = await AttendanceSheet.countDocuments({ course: coursesList[1]._id });
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

  describe('Other roles', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
      uploadCourseFile = sinon.stub(GCloudStorageHelper, 'uploadCourseFile');
    });
    afterEach(() => {
      uploadCourseFile.restore();
    });
    const roles = [
      { name: 'client_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'trainer', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const formData = {
          course: coursesList[0]._id.toHexString(),
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

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ATTENDANCE SHEETS ROUTES - GET /attendancesheets', () => {
  let authToken = null;

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should get course\'s attendance sheets', async () => {
      const attendanceSheetsLength = await AttendanceSheet.countDocuments({ course: coursesList[0]._id });

      const response = await app.inject({
        method: 'GET',
        url: `/attendancesheets?course=${coursesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.attendanceSheets.length).toEqual(attendanceSheetsLength);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 200 },
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

describe('ATTENDANCE SHEETS ROUTES - DELETE /attendancesheets/{_id}', () => {
  let authToken = null;
  let deleteCourseFile;

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
      deleteCourseFile = sinon.stub(GCloudStorageHelper, 'deleteCourseFile');
    });
    afterEach(() => {
      deleteCourseFile.restore();
    });

    it('should delete an attendance sheet', async () => {
      const attendanceSheetId = attendanceSheetsList[0]._id;
      const attendanceSheetsLength = await AttendanceSheet.countDocuments();
      const response = await app.inject({
        method: 'DELETE',
        url: `/attendancesheets/${attendanceSheetId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(await AttendanceSheet.countDocuments()).toEqual(attendanceSheetsLength - 1);
      sinon.assert.calledOnce(deleteCourseFile);
    });

    it('should return a 404 if attendance sheet does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/attendancesheets/${new ObjectID().toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
      deleteCourseFile = sinon.stub(GCloudStorageHelper, 'deleteCourseFile');
    });
    afterEach(() => {
      deleteCourseFile.restore();
    });

    const roles = [
      { name: 'client_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'trainer', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const attendanceSheetId = attendanceSheetsList[0]._id;
        const response = await app.inject({
          method: 'DELETE',
          url: `/attendancesheets/${attendanceSheetId.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
