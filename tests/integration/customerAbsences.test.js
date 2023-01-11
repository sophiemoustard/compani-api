const { expect } = require('expect');
const qs = require('qs');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { customersList, usersList, customerAbsencesList, populateDB } = require('./seed/customerAbsencesSeed');
const app = require('../../server');
const CustomerAbsence = require('../../src/models/CustomerAbsence');

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

  describe('Other roles', () => {
    const startDate = '2021-10-01T23:59:59.999Z';
    const endDate = '2021-10-30T23:59:59.999Z';

    it('should return 200 as user is customer\'s helper', async () => {
      authToken = await getTokenByCredentials(usersList[0].local);

      const response = await app.inject({
        method: 'GET',
        url: `/customerabsences?customer=${customersList[3]._id}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

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
});

describe('CUSTOMER ABSENCES ROUTE - PUT /customerabsences/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should update a customer absence', async () => {
      const payload = {
        startDate: '2021-11-30T00:00:00.000Z',
        endDate: '2021-12-14T23:59:59.999Z',
        absenceType: 'hospitalization',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/customerabsences/${customerAbsencesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const customerAbsenceUpdated = await CustomerAbsence
        .countDocuments({ _id: customerAbsencesList[0]._id, ...payload });
      expect(customerAbsenceUpdated).toEqual(1);
    });

    it('should return a 404 if customer absence in query doesn\'t exist', async () => {
      const payload = { startDate: '2022-01-09T00:00:00.000Z', endDate: '2022-01-09T23:59:59.999Z' };

      const response = await app.inject({
        method: 'PUT',
        url: `/customerabsences/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if a customer absence already exists on this period', async () => {
      const payload = { startDate: '2021-11-02T00:00:00.000Z', endDate: '2021-11-03T00:00:00.000Z' };

      const response = await app.inject({
        method: 'PUT',
        url: `/customerabsences/${customerAbsencesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if customer is stopped on this period', async () => {
      const payload = { startDate: '2022-01-06T00:00:00.000Z', endDate: '2022-01-08T00:00:00.000Z' };

      const response = await app.inject({
        method: 'PUT',
        url: `/customerabsences/${customerAbsencesList[4]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    const payload = {
      startDate: '2021-11-30T00:00:00.000Z',
      endDate: '2021-12-14T23:59:59.999Z',
      absenceType: 'hospitalization',
    };

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/customerabsences/${customerAbsencesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMER ABSENCES ROUTE - DELETE /customerabsences/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('AUXILIARY', () => {
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should delete a customer absence', async () => {
      const customerAbsenceCountBefore = await CustomerAbsence
        .countDocuments({ customer: customerAbsencesList[0].customer._id });

      const response = await app.inject({
        method: 'DELETE',
        url: `/customerabsences/${customerAbsencesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const customerAbsenceCountAfter = await CustomerAbsence
        .countDocuments({ customer: customerAbsencesList[0].customer._id });
      expect(customerAbsenceCountAfter).toEqual(customerAbsenceCountBefore - 1);
    });

    it('should return a 404 if customer absence doesn\'t exist in user\'s company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/customerabsences/${customerAbsencesList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
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
          method: 'DELETE',
          url: `/customerabsences/${customerAbsencesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
