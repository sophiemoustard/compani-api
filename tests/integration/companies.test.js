const expect = require('expect');
const omit = require('lodash/omit');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const { company, populateDB } = require('./seed/companiesSeed');
const { MONTH } = require('../../src/helpers/constants');
const GdriveStorageHelper = require('../../src/helpers/gdriveStorage');
const Company = require('../../src/models/Company');
const Drive = require('../../src/models/Google/Drive');
const app = require('../../server');
const { getToken, authCompany, otherCompany } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');
const GetStream = require('get-stream');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COMPANIES ROUTES', () => {
  let authToken = null;
  describe('PUT /companies/:id', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should update company service', async () => {
        const payload = {
          name: 'Alenvi Alenvi',
          rhConfig: { feeAmount: 70 },
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${authCompany._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company.name).toEqual(payload.name);
      });

      it('should return 404 if no company found', async () => {
        const invalidId = new ObjectID();
        const payload = {
          name: 'Alenvi Alenvi',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${invalidId}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(404);
      });

      it('should return 403 if not the same ids', async () => {
        const invalidId = company._id.toHexString();
        const payload = {
          name: 'Alenvi Alenvi',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${invalidId}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const payload = { name: 'SuperTest' };
          const response = await app.inject({
            method: 'PUT',
            url: `/companies/${company._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST /{_id}/gdrive/{driveId}/upload', () => {
    const fakeDriveId = 'fakeDriveId';
    let addStub;
    let getFileByIdStub;

    beforeEach(() => {
      addStub = sinon.stub(Drive, 'add');
      getFileByIdStub = sinon.stub(Drive, 'getFileById');
    });

    afterEach(() => {
      addStub.restore();
      getFileByIdStub.restore();
    });

    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should upload a file', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const payload = {
          fileName: 'mandat_signe',
          file: 'true',
          type: 'contractWithCompany',
        };
        const form = generateFormData(payload);
        const response = await app.inject({
          method: 'POST',
          url: `/companies/${authCompany._id}/gdrive/${fakeDriveId}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });
        expect(response.statusCode).toEqual(200);
        sinon.assert.calledOnce(addStub);
        sinon.assert.calledOnce(getFileByIdStub);
      });

      it('should not upload file if the user is not from the same company', async () => {
        const payload = {
          fileName: 'mandat_signe',
          file: 'true',
          type: 'contractWithCompany',
        };
        const form = generateFormData(payload);

        const response = await app.inject({
          method: 'POST',
          url: `/companies/${otherCompany._id}/gdrive/${fakeDriveId}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(403);
      });
    });
  });

  describe('POST /companies', () => {
    const payload = {
      name: 'Test SARL',
      tradeName: 'Test',
      type: 'company',
      rcs: '1234567890',
      rna: '1234567890098765444',
      ics: '12345678900000',
      iban: '0987654321234567890987654',
      bic: 'BR12345678',
      rhConfig: {
        contractWithCompany: {
          grossHourlyRate: 10,
        },
        contractWithCustomer: {
          grossHourlyRate: 5,
        },
        feeAmount: 2,
        amountPerKm: 10,
        transportSubs: [{
          department: '75',
          price: 75,
        }],
      },
      customersConfig: {
        billingPeriod: MONTH,
      },
    };
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should create a new company', async () => {
        const companiesBefore = await Company.find().lean();
        const createFolderForCompanyStub = sinon
          .stub(GdriveStorageHelper, 'createFolderForCompany')
          .returns({ id: '1234567890' });
        const createFolderStub = sinon
          .stub(GdriveStorageHelper, 'createFolder')
          .returns({ id: '0987654321' });

        const response = await app.inject({
          method: 'POST',
          url: '/companies',
          payload,
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(200);
        expect(response.result.data.company).toBeDefined();
        expect(response.result.data.company).toMatchObject({
          folderId: '1234567890',
          directDebitsFolderId: '0987654321',
        });
        const companies = await Company.find().lean();
        expect(companies).toHaveLength(companiesBefore.length + 1);
        createFolderForCompanyStub.restore();
        createFolderStub.restore();
      });

      const missingParams = [
        { path: 'name' },
        { path: 'tradeName' },
        { path: 'type' },
      ];
      missingParams.forEach((test) => {
        it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/companies',
            payload: omit({ ...payload }, test.path),
            headers: { 'x-access-token': authToken },
          });
          expect(response.statusCode).toBe(400);
        });
      });
    });
  });
});
