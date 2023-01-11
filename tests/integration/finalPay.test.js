const { expect } = require('expect');
const omit = require('lodash/omit');
const { ObjectId } = require('mongodb');
const { populateDB, auxiliary, auxiliaryFromOtherCompany, surcharge } = require('./seed/finalPaySeed');
const app = require('../../server');
const FinalPay = require('../../src/models/FinalPay');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('FINAL PAY ROUTES - GET /finalpay/draft', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should compute draft final pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/finalpay/draft?startDate=2022-04-30T22:00:00.000Z&endDate=2022-05-31T21:59:59.999Z',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.draftFinalPay.length).toEqual(1);
      expect(omit(response.result.data.draftFinalPay[0], ['auxiliary', 'auxiliaryId'])).toEqual({
        overtimeHours: 0,
        additionalHours: 0,
        bonus: 0,
        endDate: new Date('2022-05-28T23:59:59.000Z'),
        month: '05-2022',
        contractHours: 39,
        holidaysHours: 1.5,
        absencesHours: 1,
        hoursToWork: 36.5,
        workedHours: 9,
        internalHours: 3,
        notSurchargedAndNotExempt: 6,
        surchargedAndNotExempt: 0,
        notSurchargedAndExempt: 2,
        surchargedAndExempt: 1,
        surchargedAndNotExemptDetails: {},
        surchargedAndExemptDetails: {
          [surcharge._id]: { planName: surcharge.name, sunday: { hours: 1, percentage: 30 } },
        },
        paidKm: 0,
        travelledKm: 0,
        paidTransportHours: 0,
        hoursBalance: -27.5,
        transport: 0,
        phoneFees: 18,
        startDate: new Date('2022-04-30T22:00:00.000Z'),
        hoursCounter: -17.5,
        mutual: true,
        diff: {
          hoursBalance: 10,
          absencesHours: 0,
          internalHours: 3,
          notSurchargedAndExempt: 1.5,
          notSurchargedAndNotExempt: 8.5,
          paidTransportHours: 0,
          surchargedAndExempt: 0,
          surchargedAndExemptDetails: {},
          surchargedAndNotExempt: 0,
          surchargedAndNotExemptDetails: {},
          workedHours: 10,
        },
        previousMonthHoursCounter: 0,
        endReason: 'mutation',
        endNotificationDate: new Date('2022-03-28T00:00:00.000Z'),
        compensation: 0,
      });
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

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'GET',
          url: '/finalpay/draft?startDate=2022-04-30T22:00:00.000Z&endDate=2022-05-31T21:59:59.999Z',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('FINAL PAY ROUTES - POST /finalpay', () => {
  let authToken;
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
    paidKm: 0,
    travelledKm: 0,
    phoneFees: 0,
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
        [new ObjectId()]: {
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
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const finalPayList = await FinalPay.countDocuments({ company: authCompany._id });
      expect(finalPayList).toEqual(1);
    });

    it('should not create a new final pay if user is not from the same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/finalpay',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: [{ ...payload[0], auxiliary: auxiliaryFromOtherCompany._id }],
      });

      expect(response.statusCode).toBe(404);
    });

    Object.keys(payload[0]).forEach((key) => {
      it(`should return a 400 error if missing '${key}' parameter`, async () => {
        const invalidPayload = { ...payload };
        delete invalidPayload[key];

        const res = await app.inject({
          method: 'POST',
          url: '/finalpay',
          payload: invalidPayload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(400);
      });
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

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/finalpay',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
