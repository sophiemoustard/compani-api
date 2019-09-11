const expect = require('expect');
const app = require('../../server');
const {
  SERVICE,
  AUXILIARY,
  HELPER,
  CUSTOMER,
  FUNDING,
  SUBSCRIPTION,
} = require('../../helpers/constants');
const { getToken } = require('./seed/authentificationSeed');
const {
  populateEvents,
  populateBills,
  populatePayment,
  populatePay,
  paymentsList,
  populateService,
  populateUser,
  populateCustomer,
} = require('./seed/exportSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EXPORTS ROUTES', () => {
  let authToken = null;

  describe('GET /exports/working_event/history', () => {
    describe('Admin', () => {
      beforeEach(populateEvents);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
      it('should get working events', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/working_event/history?startDate=2019-01-15T15%3A47%3A42.077%2B01%3A00&endDate=2019-01-17T15%3A47%3A42.077%2B01%3A00',
          headers: { 'x-access-token': authToken },
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
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/working_event/history?startDate=2019-01-15T15%3A47%3A42.077%2B01%3A00&endDate=2019-01-17T15%3A47%3A42.077%2B01%3A00',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/bill/history', () => {
    describe('Admin', () => {
      beforeEach(populateBills);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
      it('should get bills', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/bill/history?startDate=2019-05-26T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-29T15%3A47%3A42.077%2B01%3A00',
          headers: { 'x-access-token': authToken },
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
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/bill/history?startDate=2019-05-26T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-29T15%3A47%3A42.077%2B01%3A00',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/payment/history', () => {
    describe('Admin', () => {
      beforeEach(populatePayment);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
      it('should get payments', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/payment/history?startDate=2019-05-25T16%3A47%3A49.168%2B02%3A00&endDate=2019-05-31T16%3A47%3A49.169%2B02%3A00',
          headers: { 'x-access-token': authToken },
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
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/payment/history?startDate=2019-05-25T16%3A47%3A49.168%2B02%3A00&endDate=2019-05-31T16%3A47%3A49.169%2B02%3A00',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/pay/history', () => {
    describe('Admin', () => {
      beforeEach(populatePay);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
      it('should get pay', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/pay/history?startDate=2019-01-01T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-31T22%3A47%3A42.077%2B01%3A00',
          headers: { 'x-access-token': authToken },
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
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/pay/history?startDate=2019-01-01T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-31T15%3A47%3A42.077%2B01%3A00',
            headers: { 'x-access-token': authToken },
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
      lineCount: 2,
    },
    {
      exportType: HELPER,
      populate: populateUser,
      lineCount: 2,
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
  ];

  for (const { exportType, populate, lineCount } of exportTypes) {
    // eslint-disable-next-line no-loop-func
    describe(`GET /exports/${exportType}/data`, () => {
      describe('Admin', () => {
        beforeEach(populate);
        beforeEach(async () => {
          authToken = await getToken('admin');
        });
        it(`should get ${exportType}`, async () => {
          const response = await app.inject({
            method: 'GET',
            url: `/exports/${exportType}/data`,
            headers: { 'x-access-token': authToken },
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
          { name: 'coach', expectedCode: 200 },
        ];

        roles.forEach((role) => {
          it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
            authToken = await getToken(role.name);
            const response = await app.inject({
              method: 'GET',
              url: `/exports/${exportType}/data`,
              headers: { 'x-access-token': authToken },
            });

            expect(response.statusCode).toBe(role.expectedCode);
          });
        });
      });
    });
  }
});
