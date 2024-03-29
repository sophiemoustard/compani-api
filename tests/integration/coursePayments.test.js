const { expect } = require('expect');
const omit = require('lodash/omit');
const { ObjectId } = require('mongodb');
const app = require('../../server');
const { courseBillsList, coursePaymentsList, populateDB } = require('./seed/coursePaymentsSeed');

const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const { PAYMENT, DIRECT_DEBIT, REFUND } = require('../../src/helpers/constants');
const CoursePayment = require('../../src/models/CoursePayment');
const CoursePaymentNumber = require('../../src/models/CoursePaymentNumber');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('COURSE PAYMENTS ROUTES - POST /coursepayments', () => {
  let authToken;
  beforeEach(populateDB);
  const payload = {
    date: '2022-03-08T00:00:00.000Z',
    courseBill: courseBillsList[0]._id,
    netInclTaxes: 1200.20,
    nature: PAYMENT,
    type: DIRECT_DEBIT,
  };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should create a payment and a refund', async () => {
      const paymentResponse = await app.inject({
        method: 'POST',
        url: '/coursepayments',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(paymentResponse.statusCode).toBe(200);

      const newPayment = await CoursePayment
        .countDocuments({ ...payload, number: 'REG-00002', companies: [authCompany._id] });
      const paymentNumber = await CoursePaymentNumber.findOne({ nature: PAYMENT }).lean();
      expect(newPayment).toBeTruthy();
      expect(paymentNumber.seq).toBe(2);

      const refundResponse = await app.inject({
        method: 'POST',
        url: '/coursepayments',
        payload: { ...payload, nature: REFUND },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(refundResponse.statusCode).toBe(200);

      const newRefund = await CoursePayment
        .countDocuments({ ...payload, nature: REFUND, number: 'REMB-00001', companies: [authCompany._id] });
      const refundNumber = await CoursePaymentNumber.findOne({ nature: REFUND }).lean();
      expect(newRefund).toBeTruthy();
      expect(refundNumber.seq).toBe(1);
    });

    const missingParams = ['date', 'courseBill', 'netInclTaxes', 'nature', 'type'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if '${param}' param is missing`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/coursepayments',
          payload: omit(payload, [param]),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    const wrongValues = [
      { key: 'netInclTaxes', value: -200 },
      { key: 'netInclTaxes', value: '200€' },
      { key: 'nature', value: 'credit_note' },
      { key: 'type', value: 'cesu' },
    ];
    wrongValues.forEach((param) => {
      it(`should return a 400 error if '${param}' param is missing`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/coursepayments',
          payload: { ...payload, [param.key]: param.value },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    it('should return a 404 if course bill doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/coursepayments',
        payload: { ...payload, courseBill: new ObjectId() },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if course bill is not validated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/coursepayments',
        payload: { ...payload, courseBill: courseBillsList[1]._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/coursepayments',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('COURSE PAYMENTS ROUTES - PUT /coursepayments/{_id}', () => {
  let authToken;
  beforeEach(populateDB);
  const payload = {
    date: '2022-03-09T00:00:00.000Z',
    netInclTaxes: 1200.20,
    type: DIRECT_DEBIT,
  };

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update a payment', async () => {
      const paymentResponse = await app.inject({
        method: 'PUT',
        url: `/coursepayments/${coursePaymentsList[0]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(paymentResponse.statusCode).toBe(200);

      const editedPayment = await CoursePayment.countDocuments({ ...payload, _id: coursePaymentsList[0]._id });
      expect(editedPayment).toBeTruthy();
    });

    const wrongValues = [
      { key: 'netInclTaxes', value: -200 },
      { key: 'netInclTaxes', value: '200€' },
      { key: 'type', value: 'cesu' },
    ];
    wrongValues.forEach((param) => {
      it(`should return a 400 error if '${param}' param is missing`, async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/coursepayments/${coursePaymentsList[0]._id}`,
          payload: { ...payload, [param.key]: param.value },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(400);
      });
    });

    it('should return a 404 if payment doesn\'t exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/coursepayments/${new ObjectId()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'PUT',
          url: `/coursepayments/${coursePaymentsList[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
