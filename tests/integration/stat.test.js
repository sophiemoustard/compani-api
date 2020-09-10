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
  let clientAdminToken = null;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      clientAdminToken = await getToken('client_admin');
    });
    it('should get customer follow up', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-follow-up?customer=${customerList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.followUp.length).toBe(1);
      expect(res.result.data.followUp[0].totalHours).toBe(5);
      expect(res.result.data.followUp[0]._id.toHexString()).toEqual(userList[0]._id.toHexString());
    });

    it('should not get customer follow up if customer is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-follow-up?customer=${customerFromOtherCompany._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(403);
    });
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
  let clientAdminToken = null;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFundingsMonitoring);
    beforeEach(async () => {
      clientAdminToken = await getToken('client_admin');
    });

    it('should get customer fundings monitoring', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-fundings-monitoring?customer=${customerList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
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
        headers: { 'x-access-token': clientAdminToken },
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
  let clientAdminToken = null;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFundingsMonitoring);
    beforeEach(async () => {
      clientAdminToken = await getToken('client_admin');
    });

    it('should get all customers fundings monitoring', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/all-customers-fundings-monitoring',
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.allCustomersFundingsMonitoring).toEqual(expect.arrayContaining([
        expect.objectContaining({
          sector: expect.objectContaining({ name: 'Neptune' }),
          customer: expect.objectContaining({ lastname: 'Giscard d\'Estaing' }),
          referent: expect.objectContaining({ firstname: 'Auxiliary', lastname: 'Black' }),
          currentMonthCareHours: 6,
          prevMonthCareHours: 4,
          nextMonthCareHours: 0,
        }),
      ]));
    });
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

describe('GET /stats/paid-intervention-stats', () => {
  let clientAdminToken = null;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      clientAdminToken = await getToken('client_admin');
    });

    it('should get customer and duration stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.paidInterventionStats[0]).toBeDefined();
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
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.paidInterventionStats[0]).toBeDefined();
      expect(res.result.data.paidInterventionStats[0]._id).toEqual(userList[0]._id);
      expect(res.result.data.paidInterventionStats[0].customerCount).toEqual(2);
      expect(res.result.data.paidInterventionStats[0].duration).toEqual(3.5);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[2]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 if auxiliary is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=07-2019&auxiliary=${userList[2]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get customer and duration stats as auxiliary and sector are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/paid-intervention-stats?month=07-2019',
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if month does not correspond to regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/paid-intervention-stats?month=072019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(400);
    });
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
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/paid-intervention-stats?month=07-2019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/customer-duration/sector', () => {
  let clientAdminToken = null;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      clientAdminToken = await getToken('client_admin');
    });

    it('should get customer and duration stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=07-2019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customersAndDuration[0]).toBeDefined();
      expect(res.result.data.customersAndDuration[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.customersAndDuration[0].customerCount).toEqual(2);
      expect(res.result.data.customersAndDuration[0].averageDuration).toEqual(2.5);
      expect(res.result.data.customersAndDuration[0].auxiliaryTurnOver).toEqual(1.5);
    });

    it('should return only relevant hours if an auxiliary has changed sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=11-2019&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(200);
      const oldSectorCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[0]._id.toHexString());
      const newSectorCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[1]._id.toHexString());

      expect(oldSectorCustomersAndDuration).toBeDefined();
      expect(oldSectorCustomersAndDuration.customerCount).toEqual(1);
      expect(oldSectorCustomersAndDuration.averageDuration).toEqual(1.5);
      expect(oldSectorCustomersAndDuration.auxiliaryTurnOver).toEqual(1);

      expect(newSectorCustomersAndDuration).toBeDefined();
      expect(newSectorCustomersAndDuration.customerCount).toEqual(2);
      expect(newSectorCustomersAndDuration.averageDuration).toEqual(2.5);
      expect(newSectorCustomersAndDuration.auxiliaryTurnOver).toEqual(1);
    });

    it('should return only relevant hours if an customer has changed referent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=01-2020&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(200);
      const oldSectosrCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[1]._id.toHexString());
      const newSectosrCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[0]._id.toHexString());

      expect(oldSectosrCustomersAndDuration).toBeDefined();
      expect(oldSectosrCustomersAndDuration.customerCount).toEqual(1);
      expect(oldSectosrCustomersAndDuration.averageDuration).toEqual(2.5);
      expect(oldSectosrCustomersAndDuration.auxiliaryTurnOver).toEqual(1);

      expect(newSectosrCustomersAndDuration).toBeDefined();
      expect(newSectosrCustomersAndDuration.customerCount).toEqual(1);
      expect(newSectosrCustomersAndDuration.averageDuration).toEqual(1.5);
      expect(newSectosrCustomersAndDuration.auxiliaryTurnOver).toEqual(1);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=07-2019&sector=${sectorList[2]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get customer and duration stats as sector is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/customer-duration/sector?month=07-2019',
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if month does not correspond to regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=072019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });
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
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/customer-duration/sector?month=07-2019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /stats/internal-billed-hours', () => {
  let clientAdminToken = null;

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      clientAdminToken = await getToken('client_admin');
    });

    it('should get internal and billed hours stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=07-2019&sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.internalAndBilledHours[0]).toBeDefined();
      expect(res.result.data.internalAndBilledHours[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.internalAndBilledHours[0].internalHours).toEqual(1);
      expect(res.result.data.internalAndBilledHours[0].interventions).toEqual(5);
    });

    it('should return only relevant hours if an auxiliary has changed sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=11-2019&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(200);
      const oldSectosrInternalAndBilledHours = res.result.data.internalAndBilledHours
        .find(cad => cad.sector.toHexString() === sectorList[0]._id.toHexString());
      const newSectosrInternalAndBilledHours = res.result.data.internalAndBilledHours
        .find(cad => cad.sector.toHexString() === sectorList[1]._id.toHexString());

      expect(oldSectosrInternalAndBilledHours).toBeDefined();
      expect(oldSectosrInternalAndBilledHours.interventions).toEqual(4);
      expect(oldSectosrInternalAndBilledHours.internalHours).toEqual(2);

      expect(newSectosrInternalAndBilledHours).toBeDefined();
      expect(newSectosrInternalAndBilledHours.interventions).toEqual(2.5);
      expect(newSectosrInternalAndBilledHours.internalHours).toEqual(0);
    });

    it('should return 403 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=07-2019&sector=${sectorList[2]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not get internal and billed hours stats as sector is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/internal-billed-hours?month=07-2019',
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get internal and billed hours stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get internal and billed hours stats if month does not correspond to regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?sector=${sectorList[0]._id}`,
        headers: { 'x-access-token': clientAdminToken },
      });

      expect(res.statusCode).toBe(400);
    });
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
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/stats/internal-billed-hours?month=07-2019&sector=${sectorList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
