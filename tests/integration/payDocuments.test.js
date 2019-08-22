
const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const GetStream = require('get-stream');
// const omit = require('lodash/omit');
// const cloneDeep = require('lodash/cloneDeep');
const app = require('../../server');
const Gdrive = require('../../models/Google/Drive');
const PayDocument = require('../../models/PayDocument');
const { populateDB, payDocumentsList } = require('./seed/payDocumentsSeed');
const { getToken } = require('./seed/authentificationSeed');
const GdriveStorage = require('../../helpers/gdriveStorage');
const { PAYSLIP } = require('../../helpers/constants');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

const _generateFormData = (payload) => {
  const form = new FormData();

  for (const k in payload) {
    form.append(k, payload[k]);
  }
  return form;
};

describe('PAY DOCUMENT ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  describe('POST /paydocuments', () => {
    let docPayload;
    beforeEach(() => {
      docPayload = {
        payDoc: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        driveFolderId: '09876543211',
        fileName: 'pay-document',
        nature: PAYSLIP,
        date: new Date('2019-01-23').toISOString(),
        'Content-Type': 'application/pdf',
      };
    });

    it('should create a new pay document', async () => {
      const addStub = sinon.stub(Gdrive, 'add');
      const addFileStub = sinon.stub(GdriveStorage, 'addFile').returns({
        id: '1234567890',
        webViewLink: 'http://test.com/file.pdf',
      });

      const form = _generateFormData(docPayload);

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
      addFileStub.restore();
      addStub.restore();
    });

    // const wrongParams = [
    //   { path: 'payDoc', type: 'missing' },
    //   { path: 'fileName', type: 'missing' },
    //   { path: 'nature', type: 'missing' },
    //   { path: 'Content-Type', type: 'missing' },
    //   { path: 'driveFolderId', type: 'missing' },
    // ];
    // wrongParams.forEach((param) => {
    //   it(`should return a 400 error if ${param.type} '${param.path}' parameter`, async () => {
    //     const form = _generateFormData(omit(cloneDeep(docPayload), param.path));
    //     console.log('MEH');
    //     let response;
    //     try {
    //       response = await app.inject({
    //         method: 'POST',
    //         url: '/paydocuments',
    //         payload: await GetStream(form),
    //         headers: { ...form.getHeaders(), 'x-access-token': authToken },
    //       });
    //     } catch (e) {
    //       console.log(e);
    //     }

    //     expect(response.statusCode).toBe(400);
    //   });
    // });
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
});
