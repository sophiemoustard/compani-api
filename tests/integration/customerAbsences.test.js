const expect = require('expect');
const qs = require('qs');
const omit = require('lodash/omit');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { customersList, helperCustomer, populateDB } = require('./seed/customerAbsencesSeed');
const app = require('../../server');

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
        url: `/customerabsences?customer=${customersList[0]._id}&customer=${customersList[2]._id}`
          + `&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.customerAbsences.length).toEqual(2);
    });

    it('should return 400 if startDate is after endDate', async () => {
      const startDate = '2021-10-30T23:59:59.999Z';
      const endDate = '2021-10-25T23:59:59.999Z';
      const response = await app.inject({
        method: 'GET',
        url: `/customerabsences?customer=${customersList[0]._id}&customer=${customersList[2]._id}`
          + `&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    ['customer', 'startDate', 'endDate'].forEach((param) => {
      const query = {
        startDate: '2021-10-01T23:59:59.999Z',
        endDate: '2021-10-30T23:59:59.999Z',
        customer: customersList[0]._id.toHexString(),
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

    it('should return 404 if customer and logged user have different companies', async () => {
      const startDate = '2021-10-01T23:59:59.999Z';
      const endDate = '2021-10-30T23:59:59.999Z';
      const response = await app.inject({
        method: 'GET',
        url: `/customerabsences?customer=${customersList[1]._id}&customer=${customersList[2]._id}`
          + `&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

describe('Other roles', () => {
  let authToken;
  const startDate = '2021-10-01T23:59:59.999Z';
  const endDate = '2021-10-30T23:59:59.999Z';
  const roles = [
    { name: 'coach', expectedCode: 200 },
    { name: 'vendor_admin', expectedCode: 403 },
    { name: 'helper', expectedCode: 403 },
    {
      name: 'helper\'s customer',
      expectedCode: 200,
      url: `/customerAbsences?customer=${customersList[1]._id.toHexString()}&startDate=${startDate}&endDate=${endDate}`,
      customCredentials: { ...helperCustomer.local },
    },
    { name: 'auxiliary_without_company', expectedCode: 403 },
  ];

  roles.forEach((role) => {
    it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
      authToken = role.customCredentials
        ? await getTokenByCredentials(role.customCredentials)
        : await getToken(role.name);
      const response = await app.inject({
        method: 'GET',
        url: role.url || `/customerabsences?customer=${customersList[0]._id}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(role.expectedCode);
    });
  });
});
