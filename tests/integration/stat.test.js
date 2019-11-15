const expect = require('expect');
const moment = require('moment');
const app = require('../../server');
const {
  customerList,
  populateDB,
  populateDBWithEventsForFollowup,
  populateDBWithEventsForFundingsMonitoring,
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
        url: `/stats/customer-fundings-monitoring/${customerList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      const currentMonth = moment().format('YYYY-MM');
      const previousMonth = moment().subtract(1, 'months').format('YYYY-MM');

      expect(res.statusCode).toBe(200);
      expect(res.result[currentMonth]).toBeDefined();
      expect(res.result[currentMonth][customerList[0].fundings[0].versions[0]._id]).toBeDefined();
      expect(res.result[currentMonth][customerList[0].fundings[0].versions[0]._id].possibleCareHours).toBe(40);
      expect(res.result[currentMonth][customerList[0].fundings[0].versions[0]._id].careHours).toBe(6);
      expect(res.result[previousMonth]).toBeDefined();
      expect(res.result[previousMonth][customerList[0].fundings[0].versions[0]._id]).toBeDefined();
      expect(res.result[previousMonth][customerList[0].fundings[0].versions[0]._id].possibleCareHours).toBe(40);
      expect(res.result[previousMonth][customerList[0].fundings[0].versions[0]._id].careHours).toBe(4);
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
          url: `/stats/customer-fundings-monitoring/${customerList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
