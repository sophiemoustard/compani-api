const expect = require('expect');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const GetStream = require('get-stream');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const app = require('../../server');
const TaxCertificate = require('../../src/models/TaxCertificate');
const Gdrive = require('../../src/models/Google/Drive');
const GDriveStorageHelper = require('../../src/helpers/gDriveStorage');
const { populateDB, customersList, taxCertificatesList, helper } = require('./seed/taxCertificatesSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TAX CERTIFICATES ROUTES - GET /', () => {
  let authToken;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get tax certificates list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates?customer=${customersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const customerCertificates = taxCertificatesList
        .filter(tc => tc.customer.toHexString() === customersList[0]._id.toHexString());
      expect(response.result.data.taxCertificates.length).toEqual(customerCertificates.length);
    });

    it('should return 404 if customer from another organisation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates?customer=${customersList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return customer tax certificates pdf if I am its helper', async () => {
      authToken = await getTokenByCredentials(helper.local);
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates?customer=${customersList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/taxcertificates?customer=${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('TAX CERTIFICATES ROUTES - GET /{_id}/pdf', () => {
  let authToken;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get tax certificates pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${taxCertificatesList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should should return 404 if tax certificate from another organisation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${taxCertificatesList[2]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return tax certificates pdf if I am its helper', async () => {
      authToken = await getTokenByCredentials(helper.local);
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${taxCertificatesList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/taxcertificates/${taxCertificatesList[0]._id}/pdfs`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('TAX CERTIFICATES - POST /', () => {
  let authToken;
  describe('COACH', () => {
    let addStub;
    let addFileStub;
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
      addStub = sinon.stub(Gdrive, 'add');
      addFileStub = sinon.stub(GDriveStorageHelper, 'addFile').returns({
        id: '1234567890',
        webViewLink: 'http://test.com/file.pdf',
      });
    });
    afterEach(() => {
      addStub.restore();
      addFileStub.restore();
    });

    it('should create a new tax certificate', async () => {
      const docPayload = {
        taxCertificate: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        driveFolderId: '09876543211',
        fileName: 'tax-certificate',
        date: '2019-01-23T00:00:00.000Z',
        year: '2019',
        customer: customersList[0]._id.toHexString(),
        mimeType: 'application/pdf',
      };

      const form = generateFormData(docPayload);

      const response = await app.inject({
        method: 'POST',
        url: '/taxcertificates',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.taxCertificate).toMatchObject({
        date: new Date(docPayload.date),
        year: '2019',
        company: authCompany._id,
        customer: customersList[0]._id,
        driveFile: { driveId: '1234567890', link: 'http://test.com/file.pdf' },
      });
      sinon.assert.calledWithExactly(
        addFileStub,
        {
          driveFolderId: docPayload.driveFolderId,
          name: docPayload.fileName,
          type: docPayload.mimeType,
          body: sinon.match.any,

        }
      );
    });

    const wrongParams = ['taxCertificate', 'fileName', 'mimeType', 'driveFolderId', 'year', 'date'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const docPayload = {
          taxCertificate: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          driveFolderId: '09876543211',
          fileName: 'tax-certificate',
          date: '2019-01-23T00:00:00.000Z',
          year: '2019',
          customer: customersList[0]._id.toHexString(),
          mimeType: 'application/pdf',
        };
        const form = generateFormData(omit(docPayload, param));
        const response = await app.inject({
          method: 'POST',
          url: '/taxcertificates',
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return 404 if customer is not from the same company', async () => {
      const docPayload = {
        taxCertificate: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        driveFolderId: '09876543211',
        fileName: 'tax-certificate',
        date: '2019-01-23T00:00:00.000Z',
        year: '2019',
        customer: customersList[1]._id.toHexString(),
        mimeType: 'application/pdf',
      };

      const form = generateFormData(docPayload);

      const response = await app.inject({
        method: 'POST',
        url: '/taxcertificates',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if year is invalid', async () => {
      const docPayload = {
        taxCertificate: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
        driveFolderId: '09876543211',
        fileName: 'tax-certificate',
        date: '2019-01-23T00:00:00.000Z',
        year: '1988',
        customer: customersList[1]._id.toHexString(),
        mimeType: 'application/pdf',
      };

      const form = generateFormData(docPayload);

      const response = await app.inject({
        method: 'POST',
        url: '/taxcertificates',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
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
      { name: 'vendor_admin', expectedCode: 403, erp: false },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name);
        const docPayload = {
          taxCertificate: fs.createReadStream(path.join(__dirname, 'assets/test_esign.pdf')),
          driveFolderId: '09876543211',
          fileName: 'tax-certificates',
          date: '2019-01-23T00:00:00.000Z',
          year: '2019',
          customer: customersList[0]._id.toHexString(),
          mimeType: 'application/pdf',
        };

        const form = generateFormData(docPayload);

        const response = await app.inject({
          method: 'POST',
          url: '/taxcertificates',
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('TAX CERTIFICATES - DELETE /', () => {
  let authToken;
  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should delete new tax certificate', async () => {
      const taxCertificateId = taxCertificatesList[0]._id;

      const response = await app.inject({
        method: 'DELETE',
        url: `/taxcertificates/${taxCertificateId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const taxCertificatesCount = await TaxCertificate.countDocuments({ company: authCompany._id });
      expect(taxCertificatesCount).toBe(1);
    });

    it('should return 404 if tax certificate does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/taxcertificates/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const taxCertificateId = taxCertificatesList[0]._id;

        const response = await app.inject({
          method: 'DELETE',
          url: `/taxcertificates/${taxCertificateId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
