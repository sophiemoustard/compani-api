const expect = require('expect');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const { thirdPartyPayersList, populateDB, thirdPartyPayerFromOtherCompany } = require('./seed/thirdPartyPayersSeed');
const ThirdPartyPayer = require('../../src/models/ThirdPartyPayer');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const { APA, PCH } = require('../../src/helpers/constants');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('THIRD PARTY PAYERS ROUTES - POST /thirdpartypayers', () => {
  let authToken;

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

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new third party payer', async () => {
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
      const thirdPartyPayersCount = await ThirdPartyPayer.countDocuments({ company: authCompany._id });
      expect(thirdPartyPayersCount).toBe(thirdPartyPayersList.length + 1);
    });

    it('should create new tpp even if one ttp in other company has same name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/thirdpartypayers',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, name: 'Tutu' },
      });

      expect(response.statusCode).toBe(200);

      const thirdPartyPayersCount = await ThirdPartyPayer.countDocuments({ company: authCompany._id });
      expect(thirdPartyPayersCount).toBe(thirdPartyPayersList.length + 1);
    });

    it('should return 409 if other tpp in same company has same name (case and diacritics insensitive)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/thirdpartypayers',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, name: 'TOTO' },
      });

      expect(response.statusCode).toBe(409);
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
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
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
});

describe('THIRD PARTY PAYERS ROUTES - GET /thirdpartypayers', () => {
  let authToken;

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get company third party payers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/thirdpartypayers',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const thirdPartyPayerCount = await ThirdPartyPayer.countDocuments({ company: authCompany._id });
      expect(response.result.data.thirdPartyPayers.length).toEqual(thirdPartyPayerCount);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
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

describe('THIRD PARTY PAYERS ROUTES - PUT /thirdpartypayers/:id', () => {
  let authToken;
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
    teletransmissionType: APA,
    companyCode: '123456',
  };

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

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

    it('should update companyCode and teletransmissionType event without teletransmissionId', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          name: 'Aide départementale au skusku',
          teletransmissionType: PCH,
          companyCode: '234567',
          billingMode: 'indirect',
          isApa: false,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should remove companyCode and teletransmissionType by default if no teletransmissionId', async () => {
      const tppToUpdate = await ThirdPartyPayer.countDocuments({
        _id: thirdPartyPayersList[0]._id,
        teletransmissionId: { $exists: true, $ne: '' },
        teletransmissionType: { $exists: true, $ne: '' },
        companyCode: { $exists: true, $ne: '' },
      });
      expect(tppToUpdate).toBe(1);

      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          name: 'Aide départementale au skusku',
          billingMode: 'indirect',
          isApa: false,
        },
      });

      expect(response.statusCode).toBe(200);

      const updatedTpp = await ThirdPartyPayer.countDocuments({
        _id: thirdPartyPayersList[0]._id,
        teletransmissionId: '',
        teletransmissionType: '',
        companyCode: '',
      });
      expect(updatedTpp).toBe(1);
    });

    it('should update ttp name even if only case or diacritics have changed', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, name: 'Tôtö' },
      });

      expect(response.statusCode).toBe(200);

      const updatedTpp = await ThirdPartyPayer.countDocuments({ _id: thirdPartyPayersList[0]._id, name: 'Tôtö' });
      expect(updatedTpp).toBe(1);
    });

    it('should update ttp name even if ttp in other company has same name', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, name: 'Tutu' },
      });

      expect(response.statusCode).toBe(200);

      const updatedTpp = await ThirdPartyPayer.countDocuments({ _id: thirdPartyPayersList[0]._id, name: 'Tutu' });
      expect(updatedTpp).toBe(1);
    });

    it('should return 409 if other ttp in same company has same name (case and diacritics insensitive)', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payload, name: 'Tàtä' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 if missing name', async () => {
      const payloadWithoutName = omit(payload, 'name');
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: payloadWithoutName,
      });

      expect(response.statusCode).toBe(400);
    });

    const omittedField = ['companyCode', 'teletransmissionType'];
    omittedField.forEach((field) => {
      it(`should return 400  if missing ${field} when payload has teletransmissionId`, async () => {
        const payloadWithoutField = omit(payload, field);
        const response = await app.inject({
          method: 'PUT',
          url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: payloadWithoutField,
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 404 error if ttp is not from the same company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/thirdpartypayers/${thirdPartyPayerFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
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

describe('THIRD PARTY PAYERS ROUTES - DELETE /thirdpartypayers/:id', () => {
  let authToken;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete company thirdPartyPayer #tag', async () => {
      const ttpLengthBefore = await ThirdPartyPayer.countDocuments({ company: authCompany._id });
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${thirdPartyPayersList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const ttpLengthAfter = await ThirdPartyPayer.countDocuments({ company: authCompany._id });
      expect(ttpLengthAfter).toBe(ttpLengthBefore - 1);
    });

    it('should return a 404 error if ttp is not from the same company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/thirdpartypayers/${thirdPartyPayerFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
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
