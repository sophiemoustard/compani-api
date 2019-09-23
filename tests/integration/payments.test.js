const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const { paymentsList, populateDB, populateDBWithCompany, paymentCustomerList, paymentUser } = require('./seed/paymentsSeed');
const { PAYMENT, REFUND } = require('../../helpers/constants');
const translate = require('../../helpers/translate');
const Payment = require('../../models/Payment');
const Drive = require('../../models/Google/Drive');
const { getToken, getTokenByCredentials } = require('./seed/authentificationSeed');

const { language } = translate;

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('PAYMENTS ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('GET /payments', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should get all payments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/payments',
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(200);
      expect(response.result.data.payments.length).toBe(paymentsList.length);
    });
  });

  describe('Other roles', () => {
    it('should return customer payments if I am its helper', async () => {
      const helper = paymentUser;
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/payments?customer=${helper.customers[0]}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(200);
    });

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
          url: '/payments',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAYMENTS ROUTES - POST /payments', () => {
  let authToken = null;
  beforeEach(populateDB);
  const originalPayload = {
    date: moment().toDate(),
    customer: paymentCustomerList[0]._id,
    netInclTaxes: 400,
    nature: PAYMENT,
    type: 'direct_debit',
  };

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });
    const creationAssertions = [{ ...originalPayload }, { ...originalPayload, nature: REFUND }];

    creationAssertions.forEach((payload) => {
      it(`should create a ${payload.nature}`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/payments',
          payload,
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(200);
        expect(response.result.message).toBe(translate[language].paymentCreated);
        expect(response.result.data.payment).toEqual(expect.objectContaining(payload));
        expect(response.result.data.payment.number).toBe(payload.nature === PAYMENT ? `REG-${moment().format('YYMM')}001` : `REMB-${moment().format('YYMM')}001`);
        const payments = await Payment.find().lean();
        expect(payments.length).toBe(paymentsList.length + 1);
      });
    });

    const falsyAssertions = [
      {
        param: 'date',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
      {
        param: 'customer',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
      {
        param: 'netInclTaxes',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
      {
        param: 'nature',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
      {
        param: 'type',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
    ];

    falsyAssertions.forEach((test) => {
      it(`should return a 400 error if '${test.param}' param is missing`, async () => {
        test.update();
        const res = await app.inject({
          method: 'POST',
          url: '/payments',
          payload: test.payload,
          headers: { 'x-access-token': authToken },
        });
        expect(res.statusCode).toBe(400);
      });
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
        const payload = { ...originalPayload };
        const response = await app.inject({
          method: 'POST',
          url: '/payments',
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAYMENTS ROUTES - POST /payments/createlist', () => {
  let authToken = null;
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

  describe('Admin with company', () => {
    beforeEach(populateDBWithCompany);
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should create multiple payments', async () => {
      const payload = [...originalPayload];
      const addStub = sinon.stub(Drive, 'add');

      const response = await app.inject({
        method: 'POST',
        url: '/payments/createlist',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const payments = await Payment.find().lean();
      expect(payments.length).toBe(paymentsList.length + 2);
      sinon.assert.called(addStub);
      addStub.restore();
    });
  });

  describe('Admin without company', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('admin');
    });
    it('should not create multiple payments as company credentials are missing', async () => {
      const payload = [...originalPayload];
      const response = await app.inject({
        method: 'POST',
        url: '/payments/createlist',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = [...originalPayload];
        const response = await app.inject({
          method: 'POST',
          url: '/payments/createlist',
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PAYMENTS ROUTES - PUT /payments/_id', () => {
  let authToken = null;
  beforeEach(populateDB);
  const originalPayload = {
    netInclTaxes: 200,
    date: '2019-04-16T22:00:00',
    type: 'direct_debit',
  };

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should update payment', async () => {
      const payload = { ...originalPayload };
      const res = await app.inject({
        method: 'PUT',
        url: `/payments/${paymentsList[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.payment.netInclTaxes).toEqual(payload.netInclTaxes);
      expect(res.result.data.payment.date).toBeDefined();
      expect(res.result.data.payment.type).toEqual(payload.type);
    });

    it('should return 404 as payment is not found', async () => {
      const invalidId = new ObjectID();
      const payload = {
        netInclTaxes: 200,
        date: '2019-04-16T22:00:00',
        type: 'direct_debit',
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/payments/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload,
      });
      expect(res.statusCode).toBe(404);
    });

    const falsyAssertions = [
      {
        param: 'date',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
      {
        param: 'netInclTaxes',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
      {
        param: 'type',
        payload: { ...originalPayload },
        update() {
          delete this.payload[this.param];
        },
      },
    ];

    falsyAssertions.forEach((test) => {
      it(`should return a 400 error if '${test.param}' param is missing`, async () => {
        test.update();
        const res = await app.inject({
          method: 'PUT',
          url: `/payments/${paymentsList[0]._id}`,
          headers: { 'x-access-token': authToken },
          payload: test.payload,
        });
        expect(res.statusCode).toBe(400);
      });
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
        const payload = { ...originalPayload };
        const response = await app.inject({
          method: 'PUT',
          url: `/payments/${paymentsList[0]._id}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
