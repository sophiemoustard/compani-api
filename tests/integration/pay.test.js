const { expect } = require('expect');
const moment = require('moment');
const {
  populateDB,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectors,
} = require('./seed/paySeed');
const app = require('../../server');
const { getToken } = require('./helpers/authentication');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PAY ROUTES - GET /hours-balance-details', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get hours balance details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?auxiliary=${auxiliaries[0]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.hoursBalanceDetail.auxiliaryId).toEqual(auxiliaries[0]._id);
    });

    it('should get hours balance details for a sector', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[0]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.hoursBalanceDetail.length).toEqual(2);
    });

    it('should get hours balance details for many sectors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[0]._id}&sector=${sectors[1]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.hoursBalanceDetail.length).toEqual(2);
    });

    it('should return a 404 if user is not from the same company as auxiliary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?auxiliary=${auxiliaryFromOtherCompany._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if user is not from the same company as sector', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[2]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 if there is both sector and auxiliary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[0]._id}&auxiliary=${auxiliaries[0]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if missing both sector and auxiliary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/hours-balance-details?&month=10-2023',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if missing month', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if month does not correspond to regex', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[0]._id}&month=102022`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should get hours balance details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?auxiliary=${auxiliaries[0]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.hoursBalanceDetail.auxiliaryId).toEqual(auxiliaries[0]._id);
    });

    it('should get hours balance details by sector', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?sector=${sectors[0]._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.hoursBalanceDetail.length).toEqual(2);
    });

    it('should return a 404 if user is not from the same company as auxiliary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/pay/hours-balance-details?auxiliary=${auxiliaryFromOtherCompany._id}&month=10-2023`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/pay/hours-balance-details?auxiliary=${auxiliaries[0]._id}&month=10-2023`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAY ROUTES - GET /pays/export/{type}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should export identification for pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/identification?startDate=2023-11-01T00:00:00&endDate=2023-11-30T23:00:00',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
    });

    it('should export contract versions for pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/contract_version?startDate=2023-10-01T00:00:00&endDate=2023-10-31T23:59:59',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
    });

    it('should export absences for pay', async () => {
      const year = moment().year() + 1;
      const response = await app.inject({
        method: 'GET',
        url: `/pay/export/absence?startDate=${year}-11-01T00:00:00.000Z&endDate=${year}-11-30T23:00:00.000Z`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
    });

    it('should export contract ends for pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/contract_end?startDate=2023-11-01T00:00:00&endDate=2023-11-30T23:59:59',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
    });

    it('should export hours for pay', async () => {
      const year = moment().year() + 1;
      const response = await app.inject({
        method: 'GET',
        url: `/pay/export/pay?startDate=${year}-11-01T00:00:00.000Z&endDate=${year}-11-30T23:59:59.000Z`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
    });

    it('should return 400 if invalid type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/toto?startDate=2023-11-01T00:00:00&endDate=2023-11-30T23:00:00',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing endDate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/identification?startDate=2023-11-01T00:00:00',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if missing startDate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/identification?endDate=2023-11-30T23:00:00',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if startDate is after endDate', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/pay/export/identification?startDate=2023-12-01T00:00:00&endDate=2023-11-30T23:00:00',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/pay/export/identification?endDate=2020-11-30T23:00:00',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
