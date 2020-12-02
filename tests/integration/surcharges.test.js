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

describe('POST /surcharges', () => {
  let authToken = null;
  beforeEach(populateDB);
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

    const surchargesCount = await Surcharge.countDocuments({ company: authCompany._id });
    expect(surchargesCount).toEqual(surchargesList.length);
  });

  it('should return a 400 if payload has evening but no eveningStartTime', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/surcharges',
      headers: { 'x-access-token': authToken },
      payload: { name: 'Coucou', evening: 1, eveningEndTime: '23:59' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return a 400 if payload has evening but no eveningEndTime', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/surcharges',
      headers: { 'x-access-token': authToken },
      payload: { name: 'Coucou', evening: 1, eveningStartTime: '23:59' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return a 400 if payload has custom but no customStartTime', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/surcharges',
      headers: { 'x-access-token': authToken },
      payload: { name: 'Coucou', custom: 1, customEndTime: '23:59' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return a 400 if payload has custom but no customEndTime', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/surcharges',
      headers: { 'x-access-token': authToken },
      payload: { name: 'Coucou', custom: 1, customEndTime: '23:59' },
    });

    expect(response.statusCode).toBe(400);
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
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

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
  let authToken = null;
  beforeEach(populateDB);
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
      headers: { 'x-access-token': authToken },
      payload,
    });

    expect(response.statusCode).toBe(200);
  });

  it('should return 404 if no surcharge', async () => {
    const invalidId = new ObjectID().toHexString();
    const response = await app.inject({
      method: 'PUT',
      url: `/surcharges/${invalidId}`,
      headers: { 'x-access-token': authToken },
      payload: { name: 'Chasser sans son chien' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return a 404 error if user is not from the same company', async () => {
    const payload = { name: 'Chasse aux monstres printaniers', saturday: 35, sunday: 30, publicHoliday: 16 };
    const response = await app.inject({
      method: 'PUT',
      url: `/surcharges/${surchargeFromOtherCompany._id.toHexString()}`,
      headers: { 'x-access-token': authToken },
      payload,
    });

    expect(response.statusCode).toBe(404);
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
        const payload = { name: 'Chasse aux monstres printaniers', saturday: 35, sunday: 30, publicHoliday: 16 };
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
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

  it('should delete surcharge', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/surcharges/${surchargesList[0]._id.toHexString()}`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(200);

    const surchargesCount = await Surcharge.countDocuments({ company: authCompany._id });
    expect(surchargesCount).toBe(surchargesList.length - 1);
  });

  it('should return a 404 error if user is not from the same company', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/surcharges/${surchargeFromOtherCompany._id.toHexString()}`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(404);
  });

  it('should return a 404 error if invalid surcharge id', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/surcharges/${new ObjectID()}`,
      headers: { 'x-access-token': authToken },
    });

    expect(response.statusCode).toBe(404);
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
