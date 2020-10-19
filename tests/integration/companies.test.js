const expect = require('expect');
const omit = require('lodash/omit');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const GetStream = require('get-stream');
const { MONTH } = require('../../src/helpers/constants');
const GdriveStorageHelper = require('../../src/helpers/gdriveStorage');
const Company = require('../../src/models/Company');
const Drive = require('../../src/models/Google/Drive');
const app = require('../../server');
const { company, populateDB, companyClientAdmin } = require('./seed/companiesSeed');
const { getToken, authCompany, otherCompany, getTokenByCredentials } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COMPANIES ROUTES', () => {
  let authToken = null;
  describe('PUT /companies/:id', () => {
    describe('VENDOR_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('vendor_admin');
      });

      it('should update company', async () => {
        const payload = {
          name: 'Alenvi Alenvi',
          rhConfig: { phoneFeeAmount: 70 },
          apeCode: '8110Z',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${company._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company).toMatchObject(payload);
      });

      it('should return 404 if not found', async () => {
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
    });

    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getTokenByCredentials(companyClientAdmin.local);
      });

      it('should update company', async () => {
        const payload = {
          name: 'Alenvi Alenvi',
          rhConfig: { phoneFeeAmount: 70 },
          apeCode: '8110Z',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${company._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company).toMatchObject(payload);
      });

      it('should return 403 if not its company', async () => {
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

        expect(response.statusCode).toBe(403);
      });

      it('should return 403 if not the same ids', async () => {
        const invalidId = otherCompany._id.toHexString();
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

      const falsyAssertions = [
        { payload: { apeCode: '12A' }, case: 'ape code length is lower than 4' },
        { payload: { apeCode: '12345Z' }, case: 'ape code length is greater than 5' },
        { payload: { apeCode: '12345' }, case: 'ape code is missing a letter' },
        { payload: { apeCode: '1234a' }, case: 'ape code letter is in lowercase' },
        { payload: { billingAssistance: 'test@test.f' }, case: 'billing assistance email format is wrong' },
        { payload: { customersConfig: { billingPeriod: 'falsy billing period' } }, case: 'wrong billing period' },
        { payload: { address: { street: '38 rue de ponthieu' } }, case: 'wrong address' },
      ];
      falsyAssertions.forEach((assertion) => {
        it(`should return a 400 error if ${assertion.case}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/companies/${company._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload: assertion.payload,
          });

          expect(response.statusCode).toBe(400);
        });
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'trainer', expectedCode: 403 },
        { name: 'training_organisation_manager', expectedCode: 200 },
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

    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getTokenByCredentials(companyClientAdmin.local);
      });

      it('should upload a file', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const payload = {
          fileName: 'mandat_signe',
          file: 'true',
          type: 'contract',
        };
        const form = generateFormData(payload);
        const response = await app.inject({
          method: 'POST',
          url: `/companies/${company._id}/gdrive/${fakeDriveId}/upload`,
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
          type: 'contract',
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
      billingAssistance: 'test@alenvi.io',
      rhConfig: { grossHourlyRate: 10, phoneFeeAmount: 2, amountPerKm: 10 },
      customersConfig: { billingPeriod: MONTH },
    };

    describe('VENDOR_ADMIN', () => {
      let createFolderForCompany;
      let createFolder;
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('vendor_admin');
        createFolderForCompany = sinon.stub(GdriveStorageHelper, 'createFolderForCompany');
        createFolder = sinon.stub(GdriveStorageHelper, 'createFolder');
      });
      afterEach(() => {
        createFolderForCompany.restore();
        createFolder.restore();
      });

      it('should create a new company', async () => {
        const companiesBefore = await Company.find().lean();
        createFolderForCompany.returns({ id: '1234567890' });
        createFolder.onCall(0).returns({ id: '0987654321' });
        createFolder.onCall(1).returns({ id: 'qwerty' });
        createFolder.onCall(2).returns({ id: 'asdfgh' });

        const response = await app.inject({
          method: 'POST',
          url: '/companies',
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company).toBeDefined();
        expect(response.result.data.company).toMatchObject({
          subscriptions: { erp: false },
          folderId: '1234567890',
          directDebitsFolderId: '0987654321',
          customersFolderId: 'qwerty',
          auxiliariesFolderId: 'asdfgh',
          prefixNumber: 105,
        });

        const companiesCount = await Company.countDocuments();
        expect(companiesCount).toEqual(companiesBefore.length + 1);
      });

      it('should not create a company if name provided already exists', async () => {
        createFolderForCompany.returns({ id: '1234567890' });
        createFolder.onCall(0).returns({ id: '0987654321' });
        createFolder.onCall(1).returns({ id: 'qwerty' });
        createFolder.onCall(2).returns({ id: 'asdfgh' });

        const response = await app.inject({
          method: 'POST',
          url: '/companies',
          payload: { name: authCompany.name, tradeName: 'qwerty', type: 'association' },
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(409);
      });

      const missingParams = [
        { path: 'name' },
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

      const falsyAssertions = [
        { payload: { apeCode: '12A' }, case: 'ape code length is lower than 4' },
        { payload: { apeCode: '12345Z' }, case: 'ape code length is greater than 5' },
        { payload: { apeCode: '12345' }, case: 'ape code is missing a letter' },
        { payload: { apeCode: '1234a' }, case: 'ape code letter is in lowercase' },
        { payload: { billingAssistance: 'test@test.f' }, case: 'billing assistance email format is wrong' },
        { payload: { customersConfig: { billingPeriod: 'falsy billing period' } }, case: 'wrong billing period' },
        { payload: { type: 'falsy type' }, case: 'wrong company type' },
        { payload: { address: { street: '38 rue de ponthieu' } }, case: 'wrong address' },
      ];
      falsyAssertions.forEach((assertion) => {
        it(`should return a 400 error if ${assertion.case}`, async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/companies',
            headers: { 'x-access-token': authToken },
            payload: { ...payload, ...assertion.payload },
          });

          expect(response.statusCode).toBe(400);
        });
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 403 },
        { name: 'trainer', expectedCode: 403 },
        { name: 'training_organisation_manager', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: '/companies',
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /companies/first-intervention', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('client_admin');
      });
      it('should get the first intervention of the company', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/companies/first-intervention',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.firstIntervention).toBeDefined();
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
        { name: 'trainer', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 200 },
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'training_organisation_manager', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/companies/first-intervention',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /companies', () => {
    describe('VENDOR_ADMIN', () => {
      beforeEach(populateDB);

      it('should list companies', async () => {
        authToken = await getToken('vendor_admin');
        const response = await app.inject({
          method: 'GET',
          url: '/companies',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.companies).toBeDefined();
        expect(response.result.data.companies.length).toEqual(4);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 403 },
        { name: 'trainer', expectedCode: 403 },
        { name: 'training_organisation_manager', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/companies',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /companies/_id', () => {
    describe('VENDOR_ADMIN', () => {
      beforeEach(populateDB);

      it('should return company', async () => {
        authToken = await getToken('vendor_admin');
        const response = await app.inject({
          method: 'GET',
          url: `/companies/${authCompany._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company).toBeDefined();
        expect(response.result.data.company._id).toEqual(authCompany._id);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 403 },
        { name: 'trainer', expectedCode: 403 },
        { name: 'training_organisation_manager', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/companies/${authCompany._id}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
