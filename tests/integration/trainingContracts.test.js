const { expect } = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const app = require('../../server');
const TrainingContract = require('../../src/models/TrainingContract');
const { authCompany, otherCompany } = require('../seed/authCompaniesSeed');
const { populateDB, courseList } = require('./seed/trainingContractsSeed');
const { getToken } = require('./helpers/authentication');
const { generateFormData } = require('./utils');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSES ROUTES - POST /trainingcontracts', () => {
  let authToken;
  let uploadCourseFileStub;

  beforeEach(async () => {
    await populateDB();
    uploadCourseFileStub = sinon.stub(GCloudStorageHelper, 'uploadCourseFile')
      .returns({ link: 'ceciestunlien' });
  });
  afterEach(() => {
    uploadCourseFileStub.restore();
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should upload training contract', async () => {
      const formData = {
        course: courseList[0]._id.toHexString(),
        company: authCompany._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
      };
      const form = generateFormData(formData);
      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'ceciestunautrelien' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainingcontracts',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: await GetStream(form),
      });

      expect(response.statusCode).toBe(200);
      const contractTraing = await TrainingContract
        .countDocuments({ course: courseList[0]._id, company: authCompany._id, link: 'ceciestunautrelien' });
      expect(contractTraing).toBeTruthy();
    });

    it('should return 404 if course with company not found', async () => {
      const formData = {
        course: courseList[0]._id.toHexString(),
        company: otherCompany._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
      };
      const form = generateFormData(formData);
      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainingcontracts',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: await GetStream(form),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if training contract already exists for course and company', async () => {
      const formData = {
        course: courseList[1]._id.toHexString(),
        company: authCompany._id.toHexString(),
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
      };
      const form = generateFormData(formData);
      uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/trainingcontracts',
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        payload: await GetStream(form),
      });

      expect(response.statusCode).toBe(403);
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

        const formData = {
          course: courseList[0]._id.toHexString(),
          company: authCompany._id.toHexString(),
          file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        };

        const form = generateFormData(formData);
        uploadCourseFileStub.returns({ publicId: '1234567890', link: 'https://test.com/file.pdf' });

        const response = await app.inject({
          method: 'POST',
          url: '/trainingcontracts',
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
          payload: await GetStream(form),
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
