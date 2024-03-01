const { expect } = require('expect');
const app = require('../../server');
const {
  customerList,
  populateDB,
  populateDBWithEventsForFollowup,
  populateDBWithEventsForFundingsMonitoring,
  sectorList,
  userList,
  customerFromOtherCompany,
} = require('./seed/statsSeed');
const { getToken } = require('./helpers/authentication');

describe('STATS ROUTES - GET /stats/customer-follow-up', () => {
  let authToken;

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get customer follow up', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-follow-up?customer=${customerList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data).toEqual(expect.objectContaining({
        followUp: [{
          _id: userList[0]._id,
          contracts: expect.any(Array),
          inactivityDate: null,
          identity: { firstname: 'Auxiliary', lastname: 'White' },
          role: { client: { name: 'auxiliary' } },
          createdAt: expect.any(Date),
          lastEvent: expect.objectContaining({ startDate: expect.any(Date) }),
          totalHours: 5,
          sector: { name: 'Neptune' },
        }],
      }));
    });

    it('should not get customer follow up if customer is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-follow-up?customer=${customerFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/customer-follow-up?customer=${customerList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STATS ROUTES - GET /stats/customer-fundings-monitoring', () => {
  let authToken;

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFundingsMonitoring);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get customer fundings monitoring', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customerFundingsMonitoring).toEqual(expect.arrayContaining([
        { thirdPartyPayer: 'tiers payeur', careHours: 40, prevMonthCareHours: 4, currentMonthCareHours: 6 },
      ]));
    });

    it('should get only hourly and monthly fundings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.customerFundingsMonitoring.length).toBe(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STATS ROUTES - GET /stats/paid-intervention-stats', () => {
  let authToken;

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get customer and duration stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      const auxiliaryResult1 = res.result.data.paidInterventionStats
        .find(stats => stats._id.toHexString() === userList[0]._id.toHexString());
      expect(auxiliaryResult1.customerCount).toEqual(2);
      expect(auxiliaryResult1.duration).toEqual(3.5);

      const auxiliaryResult2 = res.result.data.paidInterventionStats
        .find(stats => stats._id.toHexString() === userList[1]._id.toHexString());
      expect(auxiliaryResult2.customerCount).toEqual(1);
      expect(auxiliaryResult2.duration).toEqual(1.5);
    });

    it('should get customer and duration stats for auxiliary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&auxiliary=${userList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.paidInterventionStats[0]).toEqual(expect.objectContaining({
        _id: userList[0]._id,
        customerCount: 2,
        duration: 3.5,
      }));
    });

    it('should return 404 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 if auxiliary is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&auxiliary=${userList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should not get customer and duration stats as auxiliary and sector are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/paid-intervention-stats?month=07-2019',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as auxiliary and sector are both in query', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[0]._id}&auxiliary=${userList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if month does not correspond to regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=072019&sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
