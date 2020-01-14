const expect = require('expect');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { populateDB, customersList, taxCertificatesList, helper } = require('./seed/taxCertificatesSeed');
const { getToken, getTokenByCredentials } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('TAX CERTIFICATES ROUTES - GET /', () => {
  let authToken;
  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should tax certificates list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates?customer=${customersList[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const customerCertificates = taxCertificatesList
        .filter(tc => tc.customer.toHexString() === customersList[0]._id.toHexString());
      expect(response.result.data.taxCertificates.length).toEqual(customerCertificates.length);
    });
    it('should should return 403 if customer from another organisation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates?customer=${customersList[1]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    it('should return customer bills pdf if I am its helper', async () => {
      const helperToken = await getTokenByCredentials(helper.local);
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates?customer=${customersList[0]._id}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/taxcertificates?customer=${customersList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('TAX CERTIFICATES ROUTES - GET /{_id}/pdf', () => {
  let authToken;
  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should tax certificates list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${taxCertificatesList[0]._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });
    it('should should return 404 if tax certificate from another organisation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${taxCertificatesList[2]._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
    it('should should return 404 if tax certificate does not exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${(new ObjectID()).toHexString()}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return customer bills pdf if I am its helper', async () => {
      const helperToken = await getTokenByCredentials(helper.local);
      const response = await app.inject({
        method: 'GET',
        url: `/taxcertificates/${taxCertificatesList[0]._id}/pdfs`,
        headers: { 'x-access-token': helperToken },
      });
      expect(response.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/taxcertificates/${taxCertificatesList[0]._id}/pdfs`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
