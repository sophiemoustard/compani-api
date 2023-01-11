const { expect } = require('expect');
const { surchargesList, populateDB, surchargeFromOtherCompany } = require('./seed/surchargesSeed');
const Surcharge = require('../../src/models/Surcharge');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SURCHARGES ROUTES - POST /surcharges', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new surcharge', async () => {
      const payload = {
        name: 'Chasse aux monstres automnaux',
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
        firstOfJanuary: 26,
        evening: 20,
        eveningStartTime: '21:00',
        eveningEndTime: '23:59',
        custom: 55,
        customStartTime: '12:00',
        customEndTime: '14:00',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const surchargesCount = await Surcharge.countDocuments({ company: authCompany._id });
      expect(surchargesCount).toEqual(surchargesList.length + 1);
    });

    it('should not create a new surcharge if there is no name', async () => {
      const falsyPayload = {
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
        firstOfJanuary: 26,
        evening: 20,
        eveningStartTime: '21:00',
        eveningEndTime: '23:59',
        custom: 55,
        customStartTime: '12:00',
        customEndTime: '14:00',
      };
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: falsyPayload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if payload has evening but no eveningStartTime', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Coucou', evening: 1, eveningEndTime: '23:59' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if payload has evening but no eveningEndTime', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Coucou', evening: 1, eveningStartTime: '23:59' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if payload has custom but no customStartTime', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Coucou', custom: 1, customEndTime: '23:59' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if payload has custom but no customEndTime', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { name: 'Coucou', custom: 1, customEndTime: '23:59' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach(({ name, expectedCode, erp }) => {
      it(`should return ${expectedCode} as user is ${name}${erp === false ? ' without erp' : ''}`, async () => {
        const payload = { name: 'Chasse aux monstres automnaux', saturday: 35 };
        authToken = await getToken(name, erp);
        const response = await app.inject({
          method: 'POST',
          url: '/surcharges',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(expectedCode);
      });
    });
  });
});

describe('SURCHARGES ROUTES - GET /surcharges', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should return only the surcharges from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/surcharges',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.surcharges.length).toBe(surchargesList.length);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach(({ name, expectedCode, erp }) => {
      it(`should return ${expectedCode} as user is ${name}${erp === false ? ' without erp' : ''}`, async () => {
        authToken = await getToken(name, erp);
        const response = await app.inject({
          method: 'GET',
          url: '/surcharges',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(expectedCode);
      });
    });
  });
});

describe('SURCHARGES ROUTES - PUT /surcharges/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update surcharge', async () => {
      const payload = {
        name: 'Chasse aux monstres printaniers',
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
        firstOfJanuary: 26,
        evening: 20,
        eveningStartTime: '21:00',
        eveningEndTime: '23:59',
        custom: 55,
        customStartTime: '12:00',
        customEndTime: '14:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 if surcharge from other company', async () => {
      const payload = { name: 'Chasse aux monstres printaniers', saturday: 35, sunday: 30, publicHoliday: 16 };
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${surchargeFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach(({ name, expectedCode, erp }) => {
      it(`should return ${expectedCode} as user is ${name}${erp === false ? ' without erp' : ''}`, async () => {
        const payload = { name: 'Chasse aux monstres printaniers', saturday: 35, sunday: 30, publicHoliday: 16 };
        authToken = await getToken(name, erp);
        const response = await app.inject({
          method: 'PUT',
          url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(expectedCode);
      });
    });
  });
});

describe('SURCHARGES ROUTES - DELETE /surcharges/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete surcharge', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const surchargesCount = await Surcharge.countDocuments({ company: authCompany._id });
      expect(surchargesCount).toBe(surchargesList.length - 1);
    });

    it('should return a 404 if surcharge is from other company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/surcharges/${surchargeFromOtherCompany._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach(({ name, expectedCode, erp }) => {
      it(`should return ${expectedCode} as user is ${name}${erp === false ? ' without erp' : ''}`, async () => {
        authToken = await getToken(name, erp);
        const response = await app.inject({
          method: 'DELETE',
          url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(expectedCode);
      });
    });
  });
});
