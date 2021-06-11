const expect = require('expect');
const { ObjectID } = require('mongodb');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const { thirdPartyPayersList, populateDB, thirdPartyPayerFromOtherCompany } = require('./seed/thirdPartyPayersSeed');
const ThirdPartyPayer = require('../../src/models/ThirdPartyPayer');
const app = require('../../server');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('THIRD PARTY PAYERS ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

  describe('POST /thirdpartypayers', () => {
    const payload = {
      name: 'Test',
      address: {
        fullAddress: '37 rue de Ponthieu 75008 Paris',
        street: '37 rue de Ponthieu',
        zipCode: '75008',
        city: 'Paris',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      email: 'test@test.com',
      unitTTCRate: 75,
      billingMode: 'direct',
      isApa: true,
      teletransmissionId: '012345678912345',
    };

    it('should create a new third party payer', async () => {
      const thirdPartyPayerCount = await ThirdPartyPayer.countDocuments({ company: authCompany._id }).lean();

      const response = await app.inject({
        method: 'POST',
        url: '/thirdpartypayers',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(pick(
        response.result.data.thirdPartyPayer,
        ['name', 'address', 'email', 'unitTTCRate', 'billingMode', 'company', 'isApa', 'teletransmissionId']
      )).toEqual({ ...payload, company: authCompany._id });
      const thirdPartyPayers = await ThirdPartyPayer.find({ company: authCompany._id }).lean();
      expect(thirdPartyPayers.length).toBe(thirdPartyPayerCount + 1);
    });

    const missingParams = ['name', 'billingMode', 'isApa'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if ${param} params is missing`, async () => {
        const payloadWithoutParam = omit(payload, param);
        const response = await app.inject({
          method: 'POST',
          url: '/thirdpartypayers',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: payloadWithoutParam,
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: '/thirdpartypayers',
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /thirdpartypayers', () => {
    it('should get company third party payers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/thirdpartypayers',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const thirdPartyPayerCount = await ThirdPartyPayer.countDocuments({ company: authCompany._id }).lean();
      expect(response.result.data.thirdPartyPayers.length).toEqual(thirdPartyPayerCount);
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/thirdpartypayers',
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /thirdpartypayers/:id', () => {
    const payload = {
      name: 'SuperTest',
      address: {
        fullAddress: '4 rue du test 92160 Antony',
        street: '4 rue du test',
        zipCode: '92160',
        city: 'Antony',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
      email: 't@t.com',
      unitTTCRate: 89,
      billingMode: 'indirect',
      isApa: false,
      teletransmissionId: '012345678912345',
    };
    it('should update a third party payer', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.thirdPartyPayer).toMatchObject(payload);
    });
    it('should return a 404 error if third party payer does not exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${new ObjectID().toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayerFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /thirdpartypayers/:id', () => {
    it('should delete company thirdPartyPayer', async () => {
      const thirdPartyPayerBefore = await ThirdPartyPayer.countDocuments({ company: authCompany._id }).lean();
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const thirdPartyPayers = await ThirdPartyPayer.find({ company: authCompany._id }).lean();
      expect(thirdPartyPayers.length).toBe(thirdPartyPayerBefore - 1);
    });

    it('should return a 404 error if company does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${new ObjectID().toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${thirdPartyPayerFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
