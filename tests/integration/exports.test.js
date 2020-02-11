const expect = require('expect');
const app = require('../../server');
const { SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION, SECTOR } = require('../../src/helpers/constants');
const { getToken } = require('./seed/authenticationSeed');
const {
  populateEvents,
  populateBillsAndCreditNotes,
  populatePayment,
  populatePay,
  paymentsList,
  populateService,
  populateUser,
  populateCustomer,
  populateSectorHistories,
} = require('./seed/exportSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EXPORTS ROUTES', () => {
  let adminClientToken = null;

  describe('GET /exports/working_event/history', () => {
    describe('AdminClient', () => {
      beforeEach(populateEvents);
      beforeEach(async () => {
        adminClientToken = await getToken('admin_client');
      });
      it('should get working events', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/working_event/history?startDate=2019-01-15&endDate=2019-01-17',
          headers: { 'x-access-token': adminClientToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(3);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          adminClientToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/working_event/history?startDate=2019-01-15&endDate=2019-01-17',
            headers: { 'x-access-token': adminClientToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/absence/history', () => {
    describe('AdminClient', () => {
      beforeEach(populateEvents);
      beforeEach(async () => {
        adminClientToken = await getToken('admin_client');
      });
      it('should get absences', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/absence/history?startDate=2019-01-15&endDate=2019-01-21',
          headers: { 'x-access-token': adminClientToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(2);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          adminClientToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/absence/history?startDate=2019-01-15&endDate=2019-01-17',
            headers: { 'x-access-token': adminClientToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/bill/history', () => {
    describe('AdminClient', () => {
      beforeEach(populateBillsAndCreditNotes);
      beforeEach(async () => {
        adminClientToken = await getToken('admin_client');
      });
      it('should get bills and credit notes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/bill/history?startDate=2019-05-25&endDate=2019-05-29',
          headers: { 'x-access-token': adminClientToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(4);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          adminClientToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/bill/history?startDate=2019-05-26&endDate=2019-05-29',
            headers: { 'x-access-token': adminClientToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/payment/history', () => {
    describe('AdminClient', () => {
      beforeEach(populatePayment);
      beforeEach(async () => {
        adminClientToken = await getToken('admin_client');
      });
      it('should get payments', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/payment/history?startDate=2019-05-25&endDate=2019-05-31',
          headers: { 'x-access-token': adminClientToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(paymentsList.length);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          adminClientToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/payment/history?startDate=2019-05-25&endDate=2019-05-31',
            headers: { 'x-access-token': adminClientToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/pay/history', () => {
    describe('AdminClient', () => {
      beforeEach(populatePay);
      beforeEach(async () => {
        adminClientToken = await getToken('admin_client');
      });
      it('should get pay', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/pay/history?startDate=2019-01-01&endDate=2019-05-31',
          headers: { 'x-access-token': adminClientToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(5);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          adminClientToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/pay/history?startDate=2019-01-01&endDate=2019-05-31',
            headers: { 'x-access-token': adminClientToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  const exportTypes = [
    {
      exportType: SERVICE,
      populate: populateService,
      lineCount: 3,
    },
    {
      exportType: AUXILIARY,
      populate: populateUser,
      lineCount: 3,
    },
    {
      exportType: HELPER,
      populate: populateUser,
      lineCount: 3,
    },
    {
      exportType: CUSTOMER,
      populate: populateCustomer,
      lineCount: 5,
    },
    {
      exportType: FUNDING,
      populate: populateCustomer,
      lineCount: 2,
    },
    {
      exportType: SUBSCRIPTION,
      populate: populateCustomer,
      lineCount: 3,
    },
    {
      exportType: SECTOR,
      populate: populateSectorHistories,
      lineCount: 2,
    },
  ];

  exportTypes.forEach(({ exportType, populate, lineCount }) => {
    describe(`GET /exports/${exportType}/data`, () => {
      describe('AdminClient', () => {
        beforeEach(populate);
        beforeEach(async () => {
          adminClientToken = await getToken('admin_client');
        });
        it(`should get ${exportType}`, async () => {
          const response = await app.inject({
            method: 'GET',
            url: `/exports/${exportType}/data`,
            headers: { 'x-access-token': adminClientToken },
          });

          expect(response.statusCode).toBe(200);
          expect(response.result).toBeDefined();
          expect(response.result.split('\r\n').length).toBe(lineCount);
        });
      });

      describe('Other roles', () => {
        const roles = [
          { name: 'helper', expectedCode: 403 },
          { name: 'auxiliary', expectedCode: 403 },
          { name: 'auxiliaryWithoutCompany', expectedCode: 403 },
          { name: 'coach', expectedCode: 200 },
        ];

        roles.forEach((role) => {
          it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
            adminClientToken = await getToken(role.name);
            const response = await app.inject({
              method: 'GET',
              url: `/exports/${exportType}/data`,
              headers: { 'x-access-token': adminClientToken },
            });

            expect(response.statusCode).toBe(role.expectedCode);
          });
        });
      });
    });
  });
});
