const expect = require('expect');
const app = require('../../server');
const omit = require('lodash/omit');
const qs = require('qs');
const { getToken } = require('./helpers/authentication');
const { customersList, populateDB } = require('./seed/customerAbsencesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMER ABSENCES ROUTES - GET /customerabsences', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should get all customer absences', async () => {
      const startDate = '2021-09-30T23:59:59.999Z';
      const endDate = '2021-10-30T23:59:59.999Z';
      const response = await app.inject({
        method: 'GET',
        url: `/customerabsences?customer=${customersList[0]._id}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.customerAbsences.length).toEqual(1);
    });

    it('should return 404 if customer and logged user have different companies', async () => {
      const startDate = '2021-10-01T23:59:59.999Z';
      const endDate = '2021-10-30T23:59:59.999Z';
      const response = await app.inject({
        method: 'GET',
        url: `/customerabsences?customer=${customersList[1]._id}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    ['customer', 'startDate', 'billingPeriod'].forEach((param) => {
      const query = {
        startDate: '2021-10-01T23:59:59.999Z',
        endDate: '2021-10-30T23:59:59.999Z',
        customer: customersList[0],
      };
      it(`should return 400 if ${param} is missing in the query`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/customerabsences?${qs.stringify(omit(query, [param]))}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
  
        expect(response.statusCode).toBe(400);
      });
      });
    });
  
  });

  describe('Other roles', () => {
    const startDate = '2021-10-01T23:59:59.999Z';
    const endDate = '2021-10-30T23:59:59.999Z';
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/customerabsences?customer=${customersList[0]._id}&startDate=${startDate}&endDate=${endDate}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
});
