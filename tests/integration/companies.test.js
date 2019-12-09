const expect = require('expect');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const { company, populateDB } = require('./seed/companiesSeed');
const { MONTH } = require('../../src/helpers/constants');
const Company = require('../../src/models/Company');
const app = require('../../server');
const { getToken, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COMPANIES ROUTES', () => {
  let authToken = null;
  describe('PUT /companies/:id', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should update company service', async () => {
        const payload = {
          name: 'Alenvi Alenvi',
          rhConfig: { feeAmount: 70 },
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${authCompany._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        expect(response.result.data.company.name).toEqual(payload.name);
      });

      it('should return 404 if no company found', async () => {
        const invalidId = new ObjectID();
        const payload = {
          name: 'Alenvi Alenvi',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${invalidId}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(404);
      });

      it('should return 403 if not the same ids', async () => {
        const invalidId = company._id.toHexString();
        const payload = {
          name: 'Alenvi Alenvi',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/companies/${invalidId}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('Other role', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const payload = { name: 'SuperTest' };
          const response = await app.inject({
            method: 'PUT',
            url: `/companies/${company._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST /companies', () => {
    const payload = {
      name: 'Test SARL',
      tradeName: 'Test',
      type: 'company',
      rcs: '1234567890',
      rna: '1234567890098765444',
      ics: '12345678900000',
      iban: '0987654321234567890987654',
      bic: 'BR12345678',
      rhConfig: {
        contractWithCompany: {
          grossHourlyRate: 10,
        },
        contractWithCustomer: {
          grossHourlyRate: 5,
        },
        feeAmount: 2,
        amountPerKm: 10,
        transportSubs: [{
          department: '75',
          price: 75,
        }],
      },
      customersConfig: {
        billingPeriod: MONTH,
      },
    };
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should create a new company', async () => {
        const companiesBefore = await Company.find().lean();
        const response = await app.inject({
          method: 'POST',
          url: '/companies',
          payload,
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(200);
        expect(response.result.data.company).toBeDefined();
        const companies = await Company.find().lean();
        expect(companies).toHaveLength(companiesBefore.length + 1);
      });

      const missingParams = [
        { path: 'name' },
        { path: 'tradeName' },
        { path: 'type' },
      ];
      missingParams.forEach((test) => {
        it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/companies',
            payload: omit({ ...payload }, test.path),
            headers: { 'x-access-token': authToken },
          });
          expect(response.statusCode).toBe(400);
        });
      });
    });
  });
});
