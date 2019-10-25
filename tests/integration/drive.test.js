const expect = require('expect');
const omit = require('lodash/omit');
const GetStream = require('get-stream');
const path = require('path');
const fs = require('fs');
const sinon = require('sinon');
const GdriveStorage = require('../../src/helpers/gdriveStorage');
const DriveHelper = require('../../src/helpers/drive');
const { generateFormData } = require('./utils');
const { getToken } = require('./seed/authentificationSeed');
const { auxiliary, populateDB } = require('./seed/driveSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('DRIVE ROUTES', () => {
  let authToken = null;

  describe('POST /gdrive/:id/upload', () => {
    const userFolderId = auxiliary.administrative.driveFolder.driveId;
    let addFileStub;
    let uploadFileSpy;
    beforeEach(() => {
      addFileStub = sinon.stub(GdriveStorage, 'addFile').returns({ id: 'qwerty', webViewLink: 'http://test.com/file.pdf' });
      uploadFileSpy = sinon.spy(DriveHelper, 'uploadFile');
    });

    afterEach(() => {
      addFileStub.restore();
      uploadFileSpy.restore();
    });
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
      it('should add an absence document for an event', async () => {
        const payload = {
          file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          fileName: 'absence',
        };
        const form = generateFormData(payload);
        const response = await app.inject({
          method: 'POST',
          url: `/gdrive/${userFolderId}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.payload).toMatchObject({
          attachment: {
            driveId: 'qwerty',
            link: 'http://test.com/file.pdf',
          },
        });
        sinon.assert.calledWith(uploadFileSpy, userFolderId, sinon.match({ fileName: 'absence' }));
        sinon.assert.calledOnce(addFileStub);
      });

      const missingParams = ['file', 'fileName'];
      missingParams.forEach((param) => {
        it(`should return a 400 error if '${param}' params is missing`, async () => {
          const payload = {
            file: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
            fileName: 'absence',
          };
          const form = generateFormData(omit(payload, param));
          const response = await app.inject({
            method: 'POST',
            url: `/gdrive/${userFolderId}/upload`,
            payload: await GetStream(form),
            headers: { ...form.getHeaders(), 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(400);
          sinon.assert.notCalled(uploadFileSpy);
          sinon.assert.notCalled(addFileStub);
        });
      });
    });
  });
});
