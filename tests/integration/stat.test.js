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
      expect(res.result.data.followUp.length).toBe(1);
      expect(res.result.data.followUp[0].totalHours).toBe(4);
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

    it('should get all customers fundings monitoring', async () => {
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

describe('GET /stats/customer-duration/auxiliary', () => {
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
        url: `/stats/customer-duration/auxiliary?month=072019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customersAndDuration[0]).toBeDefined();
      expect(res.result.data.customersAndDuration[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.customersAndDuration[0].customersAndDuration[0].customerCount).toEqual(1);
      expect(res.result.data.customersAndDuration[0].customersAndDuration[0].duration).toEqual(4);
    });

    it('should get customer and duration stats for auxiliary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/auxiliary?month=072019&auxiliary=${userList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customersAndDuration[0]).toBeDefined();
      expect(res.result.data.customersAndDuration[0].auxiliary).toEqual(userList[0]._id);
      expect(res.result.data.customersAndDuration[0].customerCount).toEqual(1);
      expect(res.result.data.customersAndDuration[0].duration).toEqual(2.5);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/auxiliary?month=072019&sector=${sectorList[2]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 if auxiliary is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/auxiliary?month=072019&auxiliary=${userList[2]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get customer and duration stats as auxiliary and sector are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/customer-duration/auxiliary?month=072019',
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/auxiliary?sector=${sectorList[0]._id}`,
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
          url: `/stats/customer-duration/auxiliary?month=072019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/customer-duration/sector', () => {
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
        url: `/stats/customer-duration/sector?month=072019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customersAndDuration[0]).toBeDefined();
      expect(res.result.data.customersAndDuration[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.customersAndDuration[0].customerCount).toEqual(1);
      expect(res.result.data.customersAndDuration[0].duration).toEqual(4);
    });

    it('should return only relevant hours if an auxiliary has changed sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=112019&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(200);
      const oldSectosrCustomersAndDuration = res.result.data.customersAndDuration.find(cad =>
        cad.sector.toHexString() === sectorList[0]._id.toHexString());
      const newSectosrCustomersAndDuration = res.result.data.customersAndDuration.find(cad =>
        cad.sector.toHexString() === sectorList[1]._id.toHexString());

      expect(oldSectosrCustomersAndDuration).toBeDefined();
      expect(oldSectosrCustomersAndDuration.customerCount).toEqual(1);
      expect(oldSectosrCustomersAndDuration.duration).toEqual(1.5);

      expect(newSectosrCustomersAndDuration).toBeDefined();
      expect(newSectosrCustomersAndDuration.customerCount).toEqual(1);
      expect(newSectosrCustomersAndDuration.duration).toEqual(2.5);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=072019&sector=${sectorList[2]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get customer and duration stats as sector is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/customer-duration/sector?month=072019',
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?sector=${sectorList[0]._id}`,
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
          url: `/stats/customer-duration/sector?month=072019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/customer-duration/sector', () => {
  let adminToken = null;

  describe('Admin', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      adminToken = await getToken('admin');
    });

    it('should get internal and billed hours stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=072019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.internalAndBilledHours[0]).toBeDefined();
      expect(res.result.data.internalAndBilledHours[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.internalAndBilledHours[0].internalHours).toEqual(1);
      expect(res.result.data.internalAndBilledHours[0].interventions).toEqual(4);
    });

    it('should return only relevant hours if an auxiliary has changed sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=112019&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(200);
      const oldSectosrInternalAndBilledHours = res.result.data.internalAndBilledHours.find(cad =>
        cad.sector.toHexString() === sectorList[0]._id.toHexString());
      const newSectosrInternalAndBilledHours = res.result.data.internalAndBilledHours.find(cad =>
        cad.sector.toHexString() === sectorList[1]._id.toHexString());

      expect(oldSectosrInternalAndBilledHours).toBeDefined();
      expect(oldSectosrInternalAndBilledHours.interventions).toEqual(1.5);
      expect(oldSectosrInternalAndBilledHours.internalHours).toEqual(2);

      expect(newSectosrInternalAndBilledHours).toBeDefined();
      expect(newSectosrInternalAndBilledHours.interventions).toEqual(2.5);
      expect(newSectosrInternalAndBilledHours.internalHours).toEqual(0);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=072019&sector=${sectorList[2]._id}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get internal and billed hours stats as sector is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/internal-billed-hours?month=072019',
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get internal and billed hours stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?sector=${sectorList[0]._id}`,
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
          url: `/stats/internal-billed-hours?month=072019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
