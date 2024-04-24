const { expect } = require('expect');
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
