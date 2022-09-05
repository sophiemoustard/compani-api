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

describe('STATS ROUTES - GET /stats/all-customers-fundings-monitoring', () => {
  let authToken;

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFundingsMonitoring);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get all customers fundings monitoring', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/all-customers-fundings-monitoring',
        headers: { Cookie: `alenvi_token=${authToken}` },
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
      expect(res.result.data.allCustomersFundingsMonitoring.length).toBe(1);
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
          url: '/stats/all-customers-fundings-monitoring',
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

describe('STATS ROUTES - GET /stats/customer-duration/sector', () => {
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
        url: `/stats/customer-duration/sector?month=07-2019&sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customersAndDuration[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.customersAndDuration[0].customerCount).toEqual(2);
      expect(res.result.data.customersAndDuration[0].averageDuration).toEqual(2.5);
      expect(res.result.data.customersAndDuration[0].auxiliaryTurnOver).toEqual(1.5);
    });

    it('should return only relevant hours if an auxiliary has changed sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=11-2019&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const oldSectorCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[0]._id.toHexString());
      const newSectorCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[1]._id.toHexString());

      expect(oldSectorCustomersAndDuration.customerCount).toEqual(1);
      expect(oldSectorCustomersAndDuration.averageDuration).toEqual(1.5);
      expect(oldSectorCustomersAndDuration.auxiliaryTurnOver).toEqual(1);

      expect(newSectorCustomersAndDuration.customerCount).toEqual(2);
      expect(newSectorCustomersAndDuration.averageDuration).toEqual(2.5);
      expect(newSectorCustomersAndDuration.auxiliaryTurnOver).toEqual(1);
    });

    it('should return only relevant hours if an customer has changed referent', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=01-2020&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const oldSectosrCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[1]._id.toHexString());
      const newSectosrCustomersAndDuration = res.result.data.customersAndDuration
        .find(cad => cad.sector.toHexString() === sectorList[0]._id.toHexString());

      expect(oldSectosrCustomersAndDuration.customerCount).toEqual(1);
      expect(oldSectosrCustomersAndDuration.averageDuration).toEqual(2.5);
      expect(oldSectosrCustomersAndDuration.auxiliaryTurnOver).toEqual(1);

      expect(newSectosrCustomersAndDuration.customerCount).toEqual(1);
      expect(newSectosrCustomersAndDuration.averageDuration).toEqual(1.5);
      expect(newSectosrCustomersAndDuration.auxiliaryTurnOver).toEqual(1);
    });

    it('should return 404 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=07-2019&sector=${sectorList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should not get customer and duration stats as sector is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/customer-duration/sector?month=07-2019',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get customer and duration stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 if month does not correspond to regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/customer-duration/sector?month=072019&sector=${sectorList[0]._id}`,
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
          url: `/stats/customer-duration/sector?month=07-2019&sector=${sectorList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('STATS ROUTES - GET /stats/internal-billed-hours', () => {
  let authToken;

  describe('COACH', () => {
    beforeEach(populateDB);
    beforeEach(populateDBWithEventsForFollowup);
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get internal and billed hours stats for sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=07-2019&sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.internalAndBilledHours[0].sector).toEqual(sectorList[0]._id);
      expect(res.result.data.internalAndBilledHours[0].internalHours).toEqual(1);
      expect(res.result.data.internalAndBilledHours[0].interventions).toEqual(5);
    });

    it('should return only relevant hours if an auxiliary has changed sector', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=11-2019&sector=${sectorList[0]._id}&sector=${sectorList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(200);
      const oldSectosrInternalAndBilledHours = res.result.data.internalAndBilledHours
        .find(cad => cad.sector.toHexString() === sectorList[0]._id.toHexString());
      const newSectosrInternalAndBilledHours = res.result.data.internalAndBilledHours
        .find(cad => cad.sector.toHexString() === sectorList[1]._id.toHexString());

      expect(oldSectosrInternalAndBilledHours.interventions).toEqual(4);
      expect(oldSectosrInternalAndBilledHours.internalHours).toEqual(2);

      expect(newSectosrInternalAndBilledHours.interventions).toEqual(2.5);
      expect(newSectosrInternalAndBilledHours.internalHours).toEqual(0);
    });

    it('should return 404 if sector is not from the same company', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?month=07-2019&sector=${sectorList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should not get internal and billed hours stats as sector is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/stats/internal-billed-hours?month=07-2019',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get internal and billed hours stats as month is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?sector=${sectorList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(400);
    });

    it('should not get internal and billed hours stats if month does not correspond to regex', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/stats/internal-billed-hours?sector=${sectorList[0]._id}`,
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
          url: `/stats/internal-billed-hours?month=07-2019&sector=${sectorList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
