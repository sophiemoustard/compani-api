const expect = require('expect');
const { ObjectID } = require('mongodb');
const { populateDB } = require('./seed/paySeed');
const app = require('../../server');
const Pay = require('../../src/models/Pay');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PAY ROUTES - GET /pay/draft', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });
    it('should compute draft pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/draft?startDate=2019-04-30T22:00:00.000Z&endDate=2019-05-31T21:59:59.999Z',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftPay).toBeDefined();
      expect(response.result.data.draftPay.length).toEqual(1);
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
          method: 'GET',
          url: '/pay/draft?startDate=2019-04-30T22:00:00.000Z&endDate=2019-05-31T21:59:59.999Z',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAY ROUTES - POST /pay', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = [{
    auxiliary: new ObjectID(),
    startDate: '2019-04-30T22:00:00',
    endDate: '2019-05-28T14:34:04',
    month: '05-2019',
    contractHours: 38.97,
    workedHours: 2,
    surchargedAndNotExemptDetails: {},
    surchargedAndExemptDetails: {},
    notSurchargedAndNotExempt: 2,
    surchargedAndNotExempt: 0,
    notSurchargedAndExempt: 0,
    surchargedAndExempt: 0,
    hoursBalance: -36.97,
    hoursCounter: -36.97,
    overtimeHours: 0,
    additionalHours: 0,
    mutual: true,
    transport: 0,
    otherFees: 0,
    bonus: 0,
    hoursToWork: 10,
    previousMonthHoursCounter: -2,
    diff: {
      hoursBalance: 20,
      notSurchargedAndExempt: 20,
      notSurchargedAndNotExempt: 20,
      surchargedAndExempt: 20,
      surchargedAndExemptDetails: {},
      surchargedAndNotExempt: 20,
      surchargedAndNotExemptDetails: {
        [new ObjectID()]: {
          planName: 'Toto',
          custom: { hours: 20, percentage: 10 },
        },
      },
      workedHours: 20,
    },
  }];

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should create a new pay', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/pay',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const payList = await Pay.find().lean();
      expect(payList.length).toEqual(1);
    });

    Object.keys(payload[0]).forEach((key) => {
      it(`should return a 400 error if missing '${key}' parameter`, async () => {
        const invalidPayload = { ...payload };
        delete invalidPayload[key];

        const res = await app.inject({
          method: 'POST',
          url: '/pay',
          payload: invalidPayload,
          headers: { 'x-access-token': authToken },
        });
        expect(res.statusCode).toBe(400);
      });
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
          method: 'POST',
          url: '/pay',
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
