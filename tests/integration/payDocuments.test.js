const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Gdrive = require('../../src/models/Google/Drive');
const PayDocument = require('../../src/models/PayDocument');
const { populateDB, payDocumentsList, payDocumentUser, userFromOtherCompany } = require('./seed/payDocumentsSeed');
const { getToken, getTokenByCredentials, authCompany, getUser } = require('./seed/authenticationSeed');
const GdriveStorage = require('../../src/helpers/gdriveStorage');
const { PAYSLIP } = require('../../src/helpers/constants');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PAY DOCUMENT ROUTES', () => {
  describe('POST /paydocuments', () => {
    let authToken = null;
    let addStub;
    let addFileStub;
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('client_admin');
        addStub = sinon.stub(Gdrive, 'add');
        addFileStub = sinon.stub(GdriveStorage, 'addFile').returns({
          id: '1234567890',
          webViewLink: 'http://test.com/file.pdf',
        });
      });
      afterEach(() => {
        addFileStub.restore();
        addStub.restore();
      });

      it('should create a new pay document', async () => {
        const docPayload = {
          payDoc: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          driveFolderId: '09876543211',
          fileName: 'pay-document',
          nature: PAYSLIP,
          date: new Date('2019-01-23').toISOString(),
          user: payDocumentUser._id.toHexString(),
          mimeType: 'application/pdf',
        };

        const form = generateFormData(docPayload);
        const payDocumentsLengthBefore = await PayDocument.countDocuments({ company: authCompany._id }).lean();

        const response = await app.inject({
          method: 'POST',
          url: '/paydocuments',
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.payDocument).toMatchObject({
          nature: docPayload.nature,
          date: new Date(docPayload.date),
          file: { driveId: '1234567890', link: 'http://test.com/file.pdf' },
        });
        const payDocumentsLength = await PayDocument.countDocuments({ company: authCompany._id }).lean();
        expect(payDocumentsLength).toBe(payDocumentsLengthBefore + 1);
        sinon.assert.calledOnce(addFileStub);
      });

      const wrongParams = ['payDoc', 'fileName', 'nature', 'mimeType', 'driveFolderId'];
      wrongParams.forEach((param) => {
        it(`should return a 400 error if missing '${param}' parameter`, async () => {
          const docPayload = {
            payDoc: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
            driveFolderId: '09876543211',
            fileName: 'pay-document',
            nature: PAYSLIP,
            date: new Date('2019-01-23').toISOString(),
            user: payDocumentUser._id.toHexString(),
            mimeType: 'application/pdf',
          };
          const form = generateFormData(omit(docPayload, param));
          const response = await app.inject({
            method: 'POST',
            url: '/paydocuments',
            payload: await GetStream(form),
            headers: { ...form.getHeaders(), 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(400);
        });
      });

      it('should not create a new pay document if the user is not from the same company', async () => {
        const docPayload = {
          payDoc: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          driveFolderId: '09876543211',
          fileName: 'pay-document',
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
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('Other roles', () => {
      let gDriveAdd;
      let gDriveStorageAddFile;
      beforeEach(() => {
        gDriveAdd = sinon.stub(Gdrive, 'add');
        gDriveStorageAddFile = sinon.stub(GdriveStorage, 'addFile').returns({
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
        { name: 'auxiliary', expectedCode: 403, erp: true },
        { name: 'auxiliary_without_company', expectedCode: 403, erp: true },
        { name: 'coach', expectedCode: 200, erp: true },
        { name: 'client_admin', expectedCode: 403, erp: false },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
          authToken = await getToken(role.name, role.erp);
          const docPayload = {
            payDoc: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
            driveFolderId: '09876543211',
            fileName: 'pay-document',
            nature: PAYSLIP,
            date: new Date('2019-01-23').toISOString(),
            user: payDocumentUser._id.toHexString(),
            mimeType: 'application/pdf',
          };

          const form = generateFormData(docPayload);

          const response = await app.inject({
            method: 'POST',
            url: '/paydocuments',
            payload: await GetStream(form),
            headers: { ...form.getHeaders(), 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /paydocuments', () => {
    let authToken = null;
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('client_admin');
      });

      it('should get all pay documents for one user', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/paydocuments?user=${payDocumentUser._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        const payDocumentsLength = await PayDocument.countDocuments({
          company: authCompany._id,
          user: payDocumentUser._id.toHexString(),
        });
        expect(response.result.data.payDocuments.length).toBe(payDocumentsLength);
      });

      it('should not get all pay documents if user is not from the same company', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/paydocuments?user=${userFromOtherCompany._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('Other roles', () => {
      it('should return my payDocuments', async () => {
        const auxiliaryToken = await getTokenByCredentials(payDocumentUser.local);
        const res = await app.inject({
          method: 'GET',
          url: `/paydocuments?user=${payDocumentUser._id.toHexString()}`,
          headers: { 'x-access-token': auxiliaryToken },
        });
        expect(res.statusCode).toBe(200);
      });

      it('should get my pay documents if I am an auxiliary without company', async () => {
        const user = getUser('auxiliary_without_company');
        authToken = await getToken('auxiliary_without_company');
        const response = await app.inject({
          method: 'GET',
          url: `/paydocuments?user=${user._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.payDocuments).toBeDefined();
        expect(response.result.data.payDocuments.length)
          .toBe(payDocumentsList.filter(payDocument => payDocument.user === user._id).length);
      });

      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/paydocuments?user=${payDocumentUser._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /paydocuments', () => {
    let authToken = null;
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('client_admin');
      });

      it('should delete a pay document', async () => {
        const deleteFileStub = sinon.stub(GdriveStorage, 'deleteFile');
        const payDocumentsLengthBefore = await PayDocument.countDocuments({ company: authCompany._id });
        const response = await app.inject({
          method: 'DELETE',
          url: `/paydocuments/${payDocumentsList[0]._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        const payDocumentsLength = await PayDocument.countDocuments({ company: authCompany._id });
        expect(payDocumentsLength).toBe(payDocumentsLengthBefore - 1);
        sinon.assert.calledWith(deleteFileStub, payDocumentsList[0].file.driveId);
        deleteFileStub.restore();
      });

      it('should return a 404 error if pay document does not exist', async () => {
        const randomId = new ObjectID();
        const response = await app.inject({
          method: 'DELETE',
          url: `/paydocuments/${randomId}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(404);
      });

      it('should not delete a pay document if it is not from the same company', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/paydocuments/${payDocumentsList[payDocumentsList.length - 1]._id.toHexString()}`,
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
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/paydocuments/${payDocumentsList[0]._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
