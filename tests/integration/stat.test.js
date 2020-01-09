const expect = require('expect');
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
const { getToken } = require('./seed/authenticationSeed');

describe('GET /stats/customer-follow-up', () => {
  let adminToken = null;

  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      adminToken = await getToken('admin');
    });
    it('should get customer follow up', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-follow-up?customer=${customerList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.stats.length).toBe(1);
      expect(res.result.data.stats[0].totalHours).toBe(2.5);
    });

    it('should not get customer follow up if customer is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-follow-up?customer=${customerFromOtherCompany._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/customer-follow-up?customer=${customerList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/customer-fundings-monitoring', () => {
  let adminToken = null;

  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFundingsMonitoring);
    beforeEach(async () => {
      adminToken = await getToken('admin');
    });

    it('should get customer fundings monitoring', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customerFundingsMonitoring[0]).toBeDefined();
      expect(res.result.data.customerFundingsMonitoring[0].careHours).toBe(40);
      expect(res.result.data.customerFundingsMonitoring[0].currentMonthCareHours).toBe(6);
      expect(res.result.data.customerFundingsMonitoring[0].prevMonthCareHours).toBe(4);
    });

    it('should get only hourly and monthly fundings', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.customerFundingsMonitoring.length).toBe(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/all-customers-fundings-monitoring', () => {
  let adminToken = null;

  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFundingsMonitoring);
    beforeEach(async () => {
      adminToken = await getToken('admin');
    });

    it('should get customer fundings monitoring', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/all-customers-fundings-monitoring',
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.allCustomersFundingsMonitoring[0]).toBeDefined();
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/stats/all-customers-fundings-monitoring',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/customer-duration', () => {
  let adminToken = null;

  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      adminToken = await getToken('admin');
    });

    it('should get customer and duration stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration?month=072019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customerAndDuration[0]).toBeDefined();
      expect(res.result.data.customerAndDuration[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.customerAndDuration[0].customerCount).toEqual(1);
      expect(res.result.data.customerAndDuration[0].duration).toEqual(4);
    });

    it('should get customer and duration stats for auxiliary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration?month=072019&auxiliary=${userList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customerAndDuration[0]).toBeDefined();
      expect(res.result.data.customerAndDuration[0].auxiliary).toEqual(userList[0]._id);
      expect(res.result.data.customerAndDuration[0].customerCount).toEqual(1);
      expect(res.result.data.customerAndDuration[0].duration).toEqual(2.5);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration?month=072019&sector=${sectorList[1]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 if auxiliary is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration?month=072019&auxiliary=${userList[2]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get customer and duration stats as auxiliary and sector are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/customer-duration?month=072019',
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration?sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/customer-duration?month=072019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
