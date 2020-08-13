const expect = require('expect');
const { ObjectID } = require('mongodb');

const { surchargesList, populateDB, surchargeFromOtherCompany } = require('./seed/surchargesSeed');
const Surcharge = require('../../src/models/Surcharge');
const app = require('../../server');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('SURCHARGES ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

  describe('POST /surcharges', () => {
    const payload = {
      name: 'Chasse aux monstres automnaux',
      saturday: 35,
      sunday: 30,
      publicHoliday: 16,
      twentyFifthOfDecember: 60,
      firstOfMay: 40,
      evening: 20,
      eveningStartTime: '21:00',
      eveningEndTime: '23:59',
      custom: 55,
      customStartTime: '12:00',
      customEndTime: '14:00',
    };
    it('should create a new surcharge', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/surcharges',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const surcharges = await Surcharge.find({ company: authCompany._id });
      expect(surcharges.length).toEqual(surchargesList.length + 1);
      expect(response.result.data.surcharge.company).toEqual(authCompany._id);
    });
    it('should not create a new surcharge if there is no name', async () => {
      const falsyPayload = {
        saturday: 35,
        sunday: 30,
        publicHoliday: 16,
        twentyFifthOfDecember: 60,
        firstOfMay: 40,
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
        headers: { 'x-access-token': authToken },
        payload: falsyPayload,
      });

      expect(response.statusCode).toBe(400);
      const surcharges = await Surcharge.find({ company: authCompany._id });
      expect(surcharges.length).toEqual(surchargesList.length);
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
          const token = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: '/surcharges',
            headers: { 'x-access-token': token },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /surcharges', () => {
    it('should return only the surcharges from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/surcharges',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.surcharges.length).toBe(surchargesList.length);
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
          const token = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/surcharges',
            headers: { 'x-access-token': token },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /surcharges/:id', () => {
    const payload = {
      name: 'Chasse aux monstres printaniers',
      saturday: 35,
      sunday: 30,
      publicHoliday: 16,
      twentyFifthOfDecember: 60,
      firstOfMay: 40,
      evening: 20,
      eveningStartTime: '21:00',
      eveningEndTime: '23:59',
      custom: 55,
      customStartTime: '12:00',
      customEndTime: '14:00',
    };
    it('should update surcharge', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });
      expect(response.statusCode).toBe(200);
      const surcharge = await Surcharge.findById(surchargesList[0]._id);
      expect(response.result.data.surcharge.length).toBe(surcharge.length);
    });

    it('should return 404 if no surcharge found', async () => {
      const invalidId = new ObjectID().toHexString();
      const falsyPayload = {
        name: 'Chasser sans son chien',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload: falsyPayload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/surcharges/${surchargeFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
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
          const token = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
            payload,
            headers: { 'x-access-token': token },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /surcharges/:id', () => {
    it('should delete surcharge', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const surcharges = await Surcharge.find({ company: authCompany._id });
      expect(surcharges.length).toBe(surchargesList.length - 1);
    });

    it('should return a 403 error if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/surcharges/${surchargeFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
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
          const token = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
            headers: { 'x-access-token': token },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
