
const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Gdrive = require('../../models/Google/Drive');
const PayDocument = require('../../models/PayDocument');
const { populateDB, payDocumentsList, user } = require('./seed/payDocumentsSeed');
const { getToken } = require('./seed/authentificationSeed');
const GdriveStorage = require('../../helpers/gdriveStorage');
const { PAYSLIP } = require('../../helpers/constants');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PAY DOCUMENT ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  describe('POST /paydocuments', () => {
    it('should create a new pay document', async () => {
      const docPayload = {
        payDoc: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        driveFolderId: '09876543211',
        fileName: 'pay-document',
        nature: PAYSLIP,
        date: new Date('2019-01-23').toISOString(),
        user: user._id.toHexString(),
        mimeType: 'application/pdf',
      };

      const addStub = sinon.stub(Gdrive, 'add');
      const addFileStub = sinon.stub(GdriveStorage, 'addFile').returns({
        id: '1234567890',
        webViewLink: 'http://test.com/file.pdf',
      });

      const form = generateFormData(docPayload);

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
      const payDocuments = await PayDocument.find({}).lean();
      expect(payDocuments.length).toBe(payDocumentsList.length + 1);
      sinon.assert.calledOnce(addFileStub);
      addFileStub.restore();
      addStub.restore();
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
          user: user._id.toHexString(),
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
  });

  describe('GET /paydocuments', () => {
    it('should get all pay documents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/paydocuments',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.payDocuments.length).toBe(payDocumentsList.length);
    });
  });

  describe('DELETE /paydocuments', () => {
    it('should delete a pay document', async () => {
      const deleteFileStub = sinon.stub(GdriveStorage, 'deleteFile');
      const response = await app.inject({
        method: 'DELETE',
        url: `/paydocuments/${payDocumentsList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const payDocuments = await PayDocument.find({}).lean();
      expect(payDocuments.length).toBe(payDocumentsList.length - 1);
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
  });
});
