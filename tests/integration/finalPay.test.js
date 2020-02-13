const expect = require('expect');
const { ObjectID } = require('mongodb');
const { populateDB, auxiliary, auxiliaryFromOtherCompany } = require('./seed/finalPaySeed');
const app = require('../../server');
const FinalPay = require('../../src/models/FinalPay');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('FINAL PAY ROUTES - GET /finalpay/draft', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should compute draft final pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/finalpay/draft?startDate=2019-04-30T22:00:00.000Z&endDate=2019-05-31T21:59:59.999Z',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftFinalPay).toBeDefined();
      expect(response.result.data.draftFinalPay.length).toEqual(1);
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
          method: 'GET',
          url: '/finalpay/draft?startDate=2019-04-30T22:00:00.000Z&endDate=2019-05-31T21:59:59.999Z',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('FINAL PAY ROUTES - POST /finalpay', () => {
  let authToken = null;
  beforeEach(populateDB);
  const payload = [{
    auxiliary: auxiliary._id,
    startDate: '2019-04-30T22:00:00.000Z',
    endDate: '2019-05-28T14:34:04.000Z',
    endReason: 'resignation',
    endNotificationDate: '2019-03-28T14:34:04.000Z',
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
    compensation: 0,
    paidTransportHours: 3,
    internalHours: 9,
    absencesHours: 5,
    holidaysHours: 7,
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
      paidTransportHours: 3,
      internalHours: 9,
      absencesHours: 5,
    },
    hoursToWork: 20,
    previousMonthHoursCounter: 20,
  }];

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a new final pay', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/finalpay',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const finalPayList = await FinalPay.find({ company: authCompany._id }).lean();
      expect(finalPayList.length).toEqual(1);
    });

    it('should not create a new final pay if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/finalpay',
        headers: { 'x-access-token': authToken },
        payload: [{ ...payload[0], auxiliary: auxiliaryFromOtherCompany._id }],
      });

      expect(response.statusCode).toBe(403);
    });

    Object.keys(payload[0]).forEach((key) => {
      it(`should return a 400 error if missing '${key}' parameter`, async () => {
        const invalidPayload = { ...payload };
        delete invalidPayload[key];

        const res = await app.inject({
          method: 'POST',
          url: '/finalpay',
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
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/finalpay',
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
