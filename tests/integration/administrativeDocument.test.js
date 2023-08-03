const { expect } = require('expect');
const omit = require('lodash/omit');
const sinon = require('sinon');
const AdministrativeDocument = require('../../src/models/AdministrativeDocument');
const app = require('../../server');
const Drive = require('../../src/models/Google/Drive');
const { populateDB, administrativeDocumentsList } = require('./seed/administrativeDocumentSeed');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const { generateFormData, getStream } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ADMINISTRATIVE DOCUMENT ROUTES - GET /administrativedocuments', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      await populateDB();
      authToken = await getToken('coach');
    });

    it('should return all administrative documents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/administrativedocuments',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.administrativeDocuments.length).toBe(2);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/administrativedocuments',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ADMINISTRATIVE DOCUMENT ROUTES - POST /administrativedocuments', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    let addStub;
    let createPermissionStub;
    beforeEach(async () => {
      addStub = sinon.stub(Drive, 'add');
      createPermissionStub = sinon.stub(Drive, 'createPermission');
      authToken = await getToken('client_admin');
    });
    afterEach(() => {
      addStub.restore();
      createPermissionStub.restore();
    });

    const payload = { name: 'contrat', file: 'test', mimeType: 'application/octet-stream' };

    it('should create new document', async () => {
      const form = generateFormData(payload);
      addStub.returns({ id: 'fakeFileDriveId', webViewLink: 'www.fakedriveid.fr' });

      const response = await app.inject({
        method: 'POST',
        url: '/administrativedocuments',
        payload: await getStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledWithExactly(
        createPermissionStub,
        { fileId: 'fakeFileDriveId', permission: { type: 'anyone', role: 'reader', allowFileDiscovery: false } }
      );
      const countAfter = await AdministrativeDocument.countDocuments({ company: authCompany._id });
      expect(countAfter).toBe(3);
    });

    ['name', 'file', 'mimeType'].forEach((param) => {
      it(`should return a 400 error if '${param}' is missing in payload`, async () => {
        const form = generateFormData(omit(payload, [param]));

        const response = await app.inject({
          method: 'POST',
          url: '/administrativedocuments',
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
          payload: await getStream(form),
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const form = generateFormData({ name: 'contrat', file: 'test', mimeType: 'pdf' });

        const response = await app.inject({
          method: 'POST',
          url: '/administrativedocuments',
          payload: await getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ADMINISTRATIVE DOCUMENT ROUTES - DELETE /administrativedocuments', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete an administrative document', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/administrativedocuments/${administrativeDocumentsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const administrativeDocumentsAfter = await AdministrativeDocument.find({ company: authCompany._id }).lean();
      expect(administrativeDocumentsAfter.length).toEqual(1);
    });

    it('should return a 404 if document is not from the same company', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/administrativedocuments/${administrativeDocumentsList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/administrativedocuments/${administrativeDocumentsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
