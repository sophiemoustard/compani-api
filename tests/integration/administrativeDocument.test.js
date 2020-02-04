const expect = require('expect');
const omit = require('lodash/omit');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const AdministrativeDocument = require('../../src/models/AdministrativeDocument');
const app = require('../../server');
const Drive = require('../../src/models/Google/Drive');
const { populateDB, administrativeDocumentsList } = require('./seed/administrativeDocumentSeed');
const { getToken, authCompany } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');
const GetStream = require('get-stream');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('ADMINISTRATIVE DOCUMENT ROUTES - GET /administrativedocuments', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      await populateDB();
      authToken = await getToken('admin');
    });

    it('should return all administrative documents', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/administrativedocuments',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const administrativeDocuments = await AdministrativeDocument.find({ company: authCompany._id }).lean();
      expect(response.result.data.administrativeDocuments.length).toBe(administrativeDocuments.length);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/administrativedocuments',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ADMINISTRATIVE DOCUMENT ROUTES - POST /administrativedocuments', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    let addStub;

    beforeEach(async () => {
      addStub = sinon.stub(Drive, 'add');
      authToken = await getToken('admin');
    });

    afterEach(() => {
      addStub.restore();
    });

    const payload = {
      name: 'contrat',
      file: 'test',
      mimeType: 'application/octet-stream',
    };

    it('should create new document', async () => {
      const form = generateFormData(payload);
      addStub.returns({ id: 'fakeFileDriveId', webViewLink: 'www.fakedriveid.fr' });
      const administrativeDocumentsBefore = await AdministrativeDocument.find({ company: authCompany._id });

      const response = await app.inject({
        method: 'POST',
        url: '/administrativedocuments',
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const administrativeDocumentsAfter = await AdministrativeDocument.find({ company: authCompany._id });
      expect(administrativeDocumentsAfter.length).toBe(administrativeDocumentsBefore.length + 1);
    });

    const falsyAssertions = [
      { param: 'name', payload: { ...omit(payload, ['name']) } },
      { param: 'file', payload: { ...omit(payload, ['file']) } },
      { param: 'mimeType', payload: { ...omit(payload, ['mimeType']) } },
    ];
    falsyAssertions.forEach((test) => {
      it(`should return a 400 error if '${test.param}' payload is missing`, async () => {
        const form = generateFormData(test.payload);

        const response = await app.inject({
          method: 'POST',
          url: '/administrativedocuments',
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
          payload: await GetStream(form),
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = {
          name: 'contrat',
          file: 'test',
          mimeType: 'pdf',
        };
        const form = generateFormData(payload);

        const response = await app.inject({
          method: 'POST',
          url: '/administrativedocuments',
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('ADMINISTRATIVE DOCUMENT ROUTES - DELETE /administrativedocuments', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should delete an administrative document', async () => {
      const administrativeDocumentsBefore = await AdministrativeDocument.find({ company: authCompany._id }).lean();
      const res = await app.inject({
        method: 'DELETE',
        url: `/administrativedocuments/${administrativeDocumentsList[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(200);
      const administrativeDocumentsAfter = await AdministrativeDocument.find({ company: authCompany._id }).lean();
      expect(administrativeDocumentsAfter.length).toEqual(administrativeDocumentsBefore.length - 1);
    });

    it('should return a 403 if document is not from the same company', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/administrativedocuments/${administrativeDocumentsList[2]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return a 404 if document does not exist', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/administrativedocuments/${new ObjectID()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/administrativedocuments/${administrativeDocumentsList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
