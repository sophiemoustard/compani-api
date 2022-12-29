const { expect } = require('expect');
const moment = require('moment');
const omit = require('lodash/omit');
const sinon = require('sinon');
const app = require('../../server');
const {
  paymentsList,
  populateDB,
  paymentCustomerList,
  userFromOtherCompany,
  customerFromOtherCompany,
  tppFromOtherCompany,
} = require('./seed/paymentsSeed');
const { PAYMENT } = require('../../src/helpers/constants');
const Payment = require('../../src/models/Payment');
const Drive = require('../../src/models/Google/Drive');
const PaymentHelper = require('../../src/helpers/payments');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PAYMENTS ROUTES - POST /payments', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create a payment', async () => {
      const payload = {
        date: moment('2019-09-15').toDate(),
        customer: paymentCustomerList[0]._id,
        netInclTaxes: 400,
        nature: PAYMENT,
        type: 'direct_debit',
      };
      const paymentCountBefore = await Payment.countDocuments({ company: authCompany._id });

      const response = await app.inject({
        method: 'POST',
        url: '/payments',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const paymentCountAfter = await Payment.countDocuments({ company: authCompany._id });
      expect(response.statusCode).toBe(200);
      expect(paymentCountAfter).toBe(paymentCountBefore + 1);
    });

    ['date', 'customer', 'netInclTaxes', 'nature', 'type'].forEach((param) => {
      it(`should return a 400 error if '${param}' param is missing`, async () => {
        const payload = {
          date: moment('2019-09-15').toDate(),
          customer: paymentCustomerList[0]._id,
          netInclTaxes: 400,
          nature: PAYMENT,
          type: 'direct_debit',
        };

        const res = await app.inject({
          method: 'POST',
          url: '/payments',
          payload: omit(payload, [param]),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    it('should return a 403 if customer is not from the same company', async () => {
      const payload = {
        date: moment('2019-09-15').toDate(),
        customer: customerFromOtherCompany._id,
        netInclTaxes: 400,
        nature: PAYMENT,
        type: 'direct_debit',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/payments',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if customer is archived', async () => {
      const payload = {
        date: moment('2019-09-15').toDate(),
        customer: paymentCustomerList[2]._id,
        netInclTaxes: 400,
        nature: PAYMENT,
        type: 'direct_debit',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/payments',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 if thirdPartyPayer is not from the same company', async () => {
      const payload = {
        date: moment('2019-09-15').toDate(),
        customer: paymentCustomerList[0]._id,
        netInclTaxes: 400,
        nature: PAYMENT,
        type: 'direct_debit',
        thirdPartyPayer: tppFromOtherCompany._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/payments',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 403, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'vendor_admin', expectedCode: 403, erp: true },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const payload = {
          date: moment('2019-09-15').toDate(),
          customer: paymentCustomerList[0]._id,
          netInclTaxes: 400,
          nature: PAYMENT,
          type: 'direct_debit',
        };
        const response = await app.inject({
          method: 'POST',
          url: '/payments',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAYMENTS ROUTES - POST /payments/list', () => {
  let authToken;
  const originalPayload = [
    {
      date: moment().toDate(),
      customer: paymentCustomerList[0]._id,
      customerInfo: paymentCustomerList[0],
      netInclTaxes: 900,
      nature: PAYMENT,
      type: 'direct_debit',
      rum: 'R12345678000000345634567',
    },
    {
      date: moment().toDate(),
      customer: paymentCustomerList[1]._id,
      customerInfo: paymentCustomerList[1],
      netInclTaxes: 250,
      nature: PAYMENT,
      type: 'direct_debit',
      rum: 'R12345678000000345634567',
    },
  ];

  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    let addStub;

    beforeEach(async () => {
      authToken = await getToken('client_admin');
      addStub = sinon.stub(Drive, 'add');
    });
    afterEach(() => {
      addStub.restore();
    });

    it('should create multiple payments', async () => {
      const payload = [...originalPayload];
      const paymentsCountBefore = await Payment.countDocuments({ company: authCompany._id });

      const response = await app.inject({
        method: 'POST',
        url: '/payments/list',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const paymentsCountAfter = await Payment.countDocuments({ company: authCompany._id });
      expect(paymentsCountAfter).toBe(paymentsCountBefore + 2);
      sinon.assert.called(addStub);
    });

    it('should return a 403 if at least one customer is not from the same company', async () => {
      const payload = [
        { ...originalPayload[0], customer: customerFromOtherCompany._id },
        { ...originalPayload[1] },
      ];

      const response = await app.inject({
        method: 'POST',
        url: '/payments/list',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if customer is archived', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/payments/list',
        payload: [{ ...originalPayload[0], customer: paymentCustomerList[2]._id }, { ...originalPayload[1] }],
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 400 if user tries to create a payment with an existing number', async () => {
      const generateXML = sinon.stub(PaymentHelper, 'generateXML');

      const payload = [{ ...originalPayload[0], number: paymentsList[0].number }];

      const response = await app.inject({
        method: 'POST',
        url: '/payments/list',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
      sinon.assert.notCalled(generateXML);
      generateXML.restore();
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = [...originalPayload];
        const response = await app.inject({
          method: 'POST',
          url: '/payments/list',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAYMENTS ROUTES - PUT /payments/_id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update payment', async () => {
      const payload = { netInclTaxes: 200, date: '2019-04-16T22:00:00', type: 'direct_debit' };
      const res = await app.inject({
        method: 'PUT',
        url: `/payments/${paymentsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      const paymentUpdated = await Payment.countDocuments({
        _id: paymentsList[0]._id,
        netInclTaxes: 200,
        date: '2019-04-16T22:00:00',
        type: 'direct_debit',
      });
      expect(res.statusCode).toBe(200);
      expect(paymentUpdated).toEqual(1);
    });

    it('should return a 404 if user is not from the same company', async () => {
      authToken = await getTokenByCredentials(userFromOtherCompany.local);
      const payload = { netInclTaxes: 200, date: '2019-04-16T22:00:00', type: 'direct_debit' };
      const res = await app.inject({
        method: 'PUT',
        url: `/payments/${paymentsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 if customer is archived', async () => {
      const payload = { netInclTaxes: 200, date: '2019-04-16T22:00:00', type: 'direct_debit' };
      const res = await app.inject({
        method: 'PUT',
        url: `/payments/${paymentsList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });
      expect(res.statusCode).toBe(403);
    });

    ['date', 'netInclTaxes', 'type'].forEach((param) => {
      it(`should return a 400 error if '${param}' param is missing`, async () => {
        const payload = { netInclTaxes: 200, date: '2019-04-16T22:00:00', type: 'direct_debit' };
        const res = await app.inject({
          method: 'PUT',
          url: `/payments/${paymentsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: omit(payload, [param]),
        });

        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = { netInclTaxes: 200, date: '2019-04-16T22:00:00', type: 'direct_debit' };
        const response = await app.inject({
          method: 'PUT',
          url: `/payments/${paymentsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAYMENTS ROUTES - DELETE /payments/_id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should remove payment', async () => {
      const paymentCountBefore = await Payment.countDocuments({});

      const res = await app.inject({
        method: 'DELETE',
        url: `/payments/${paymentsList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      const paymentCountAfter = await Payment.countDocuments({});
      expect(res.statusCode).toBe(200);
      expect(paymentCountAfter).toBe(paymentCountBefore - 1);
    });

    it('should return a 404 if user is not from the same company', async () => {
      authToken = await getTokenByCredentials(userFromOtherCompany.local);

      const res = await app.inject({
        method: 'DELETE',
        url: `/payments/${paymentsList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 if customer is archived', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/payments/${paymentsList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });

    it('should not remove payment if it is not refund', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/payments/${paymentsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = { netInclTaxes: 200, date: '2019-04-16T22:00:00', type: 'direct_debit' };
        const response = await app.inject({
          method: 'PUT',
          url: `/payments/${paymentsList[2]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
