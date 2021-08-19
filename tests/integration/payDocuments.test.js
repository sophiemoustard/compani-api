const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const omit = require('lodash/omit');
const app = require('../../server');
const Gdrive = require('../../src/models/Google/Drive');
const PayDocument = require('../../src/models/PayDocument');
const {
  populateDB,
  payDocumentsList,
  payDocumentUser,
  payDocumentUserCompanies,
  userFromOtherCompany,
} = require('./seed/payDocumentsSeed');
const { getToken, authCompany } = require('./seed/authenticationSeed');
const { auxiliaryWithoutCompany } = require('../seed/userSeed');
const GDriveStorageHelper = require('../../src/helpers/gDriveStorage');
const { PAYSLIP } = require('../../src/helpers/constants');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('POST /paydocuments', () => {
  let authToken;
  let addStub;
  let addFileStub;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
      addStub = sinon.stub(Gdrive, 'add');
      addFileStub = sinon.stub(GDriveStorageHelper, 'addFile');
    });
    afterEach(() => {
      addFileStub.restore();
      addStub.restore();
    });

    it('should create a new pay document', async () => {
      const payDocumentsCountBefore = await PayDocument.countDocuments({});

      const docPayload = {
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        nature: PAYSLIP,
        date: new Date('2019-01-23').toISOString(),
        user: payDocumentUserCompanies[0].user.toHexString(),
        mimeType: 'application/pdf',
      };
      const form = generateFormData(docPayload);
      addFileStub.returns({ id: '1234567890', webViewLink: 'http://test.com/file.pdf' });

      const response = await app.inject({
        method: 'POST',
        url: '/paydocuments',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      const payDocumentsCountAfter = await PayDocument.countDocuments({});
      expect(response.statusCode).toBe(200);
      expect(payDocumentsCountAfter).toBe(payDocumentsCountBefore + 1);
      sinon.assert.calledOnce(addFileStub);
    });

    ['file', 'nature', 'mimeType', 'user'].forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const docPayload = {
          file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          nature: PAYSLIP,
          date: new Date('2019-01-23').toISOString(),
          user: payDocumentUser._id.toHexString(),
          mimeType: 'application/pdf',
        };

        addFileStub.returns({ id: '1234567890', webViewLink: 'http://test.com/file.pdf' });
        const form = generateFormData(omit(docPayload, param));
        const response = await app.inject({
          method: 'POST',
          url: '/paydocuments',
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 404 if the user is not from the same company', async () => {
      const docPayload = {
        file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        nature: PAYSLIP,
        date: new Date('2019-01-23').toISOString(),
        user: userFromOtherCompany._id.toHexString(),
        mimeType: 'application/pdf',
      };

      const form = generateFormData(docPayload);

      const response = await app.inject({
        method: 'POST',
        url: '/paydocuments',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    let gDriveAdd;
    let gDriveStorageAddFile;
    beforeEach(() => {
      gDriveAdd = sinon.stub(Gdrive, 'add');
      gDriveStorageAddFile = sinon.stub(GDriveStorageHelper, 'addFile').returns({
        id: '1234567890',
        webViewLink: 'http://test.com/file.pdf',
      });
    });
    afterEach(() => {
      gDriveAdd.restore();
      gDriveStorageAddFile.restore();
    });

    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 403, erp: true },
      { name: 'vendor_admin', expectedCode: 403, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const docPayload = {
          file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          nature: PAYSLIP,
          date: new Date('2019-01-23').toISOString(),
          user: payDocumentUser._id.toHexString(),
          mimeType: 'application/pdf',
        };

        addFileStub.returns({ id: '1234567890', webViewLink: 'http://test.com/file.pdf' });
        const form = generateFormData(docPayload);

        const response = await app.inject({
          method: 'POST',
          url: '/paydocuments',
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /paydocuments', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get all pay documents for one user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/paydocuments?user=${payDocumentUser._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.payDocuments.length).toEqual(4);
    });

    it('should return a 404 if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/paydocuments?user=${userFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should get my pay documents if I am an auxiliary without company', async () => {
      authToken = await getToken('auxiliary_without_company');
      const response = await app.inject({
        method: 'GET',
        url: `/paydocuments?user=${auxiliaryWithoutCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.payDocuments.length)
        .toBe(payDocumentsList.filter(payDocument => payDocument.user === auxiliaryWithoutCompany._id).length);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/paydocuments?user=${payDocumentUser._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /paydocuments #tag', () => {
  let authToken;

  describe('COACH', () => {
    let deleteFileStub;
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
      deleteFileStub = sinon.stub(GDriveStorageHelper, 'deleteFile');
    });
    afterEach(() => {
      deleteFileStub.restore();
    });

    it('should delete a pay document', async () => {
      const payDocumentsCountBefore = await PayDocument.countDocuments({ company: authCompany._id });

      const response = await app.inject({
        method: 'DELETE',
        url: `/paydocuments/${payDocumentsList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const payDocumentsCountAfter = await PayDocument.countDocuments({ company: authCompany._id });
      expect(payDocumentsCountAfter).toBe(payDocumentsCountBefore - 1);
      sinon.assert.calledWith(deleteFileStub, payDocumentsList[0].file.driveId);
    });

    it('should return a 404 if it is not from the same company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/paydocuments/${payDocumentsList[payDocumentsList.length - 1]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/paydocuments/${payDocumentsList[0]._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
