const path = require('path');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const sinon = require('sinon');
const omit = require('lodash/omit');
const cloneDeep = require('lodash/cloneDeep');
const { generateFormData } = require('./utils');
const GetStream = require('get-stream');

const app = require('../../server');
const {
  populateDB,
  customersList,
  userList,
  customerServiceList,
  customerThirdPartyPayer,
} = require('./seed/customersSeed');
const Customer = require('../../src/models/Customer');
const ESign = require('../../src/models/ESign');
const Drive = require('../../src/models/Google/Drive');
const User = require('../../src/models/User');
const { MONTHLY, FIXED, COMPANY_CONTRACT, HOURLY, CUSTOMER_CONTRACT } = require('../../src/helpers/constants');
const { getToken, getTokenByCredentials, authCompany } = require('./seed/authenticationSeed');
const FileHelper = require('../../src/helpers/file');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMERS ROUTES', () => {
  let adminToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    adminToken = await getToken('admin');
  });

  const payload = {
    identity: { title: 'mr', lastname: 'leboncoin' },
    contact: {
      primaryAddress: {
        street: '37 rue de Ponthieu',
        zipCode: '75008',
        city: 'Paris',
      },
      secondaryAddress: {
        street: '27 rue des Renaudes',
        zipCode: '75017',
        city: 'Paris',
      },
    },
  };

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/customers',
        payload,
        headers: {
          'x-access-token': adminToken,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toMatchObject({
        company: authCompany._id,
        identity: { lastname: payload.identity.lastname },
        contact: {
          primaryAddress: {
            street: payload.contact.primaryAddress.street,
            zipCode: payload.contact.primaryAddress.zipCode,
            city: payload.contact.primaryAddress.city,
          },
          secondaryAddress: {
            street: payload.contact.secondaryAddress.street,
            zipCode: payload.contact.secondaryAddress.zipCode,
            city: payload.contact.secondaryAddress.city,
          },
        },
      });
      expect(res.result.data.customer.payment.mandates).toBeDefined();
      expect(res.result.data.customer.payment.mandates.length).toEqual(1);
      expect(res.result.data.customer.payment.mandates[0].rum).toBeDefined();
      const customers = await Customer.find({ company: authCompany._id });
      expect(customers).toHaveLength(customersList.length + 1);
    });

    const missingParams = ['identity.lastname', 'contact.primaryAddress.street', 'contact.primaryAddress.zipCode', 'contact.primaryAddress.city'];
    missingParams.forEach((paramPath) => {
      it(`should return a 400 error if missing '${paramPath}' parameter`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/customers',
          payload: omit(cloneDeep(payload), paramPath),
          headers: {
            'x-access-token': adminToken,
          },
        });
        expect(res.statusCode).toBe(400);
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
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: '/customers',
            payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers', () => {
    it('should get all customers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/customers',
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customers).toHaveLength(customersList.length);
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers/billed-events', () => {
    it('should get all customers with billed events', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/customers/billed-events',
        headers: { 'x-access-token': adminToken },
      });
      console.log(res.result.data);
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customers).toBeDefined();
      expect(res.result.data.customers[0].subscriptions).toBeDefined();
      expect(res.result.data.customers[0].subscriptions.length).toEqual(1);
      expect(res.result.data.customers[0].thirdPartyPayers).toBeDefined();
      expect(res.result.data.customers[0].thirdPartyPayers.length).toEqual(1);
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers/billed-events',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customer-contract-subscriptions', () => {
    it('should get all customers with customer contract subscriptions', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/customers/customer-contract-subscriptions',
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.customers).toBeDefined();
      expect(res.result.data.customers[0].subscriptions).toBeDefined();
      expect(res.result.data.customers[0].subscriptions
        .some(sub => sub.service.type === 'contract_with_customer')).toBeTruthy();
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers/customer-contract-subscriptions',
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers/{id}', () => {
    it('should return customer', async () => {
      const customerId = customersList[0]._id;
      const res = await app.inject({
        method: 'GET',
        url: `/customers/${customerId.toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toMatchObject({
        _id: customerId,
        subscriptions: [
          {
            ...customersList[0].subscriptions[0],
            service: {
              type: COMPANY_CONTRACT,
              defaultUnitAmount: 12,
              name: 'Service 1',
              startDate: new Date('2019-01-16 17:58:15'),
              vat: 12,
              nature: HOURLY,
            },
          },
          {
            ...customersList[0].subscriptions[1],
            service: {
              type: CUSTOMER_CONTRACT,
              defaultUnitAmount: 24,
              name: 'Service 2',
              startDate: new Date('2019-01-18 19:58:15'),
              vat: 12,
              nature: HOURLY,
            },
          },
        ],
        subscriptionsAccepted: true,
      });
    });

    it('should return a 404 error if customer is not found', async () => {
      const id = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'GET',
        url: `/customers/${id}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      it('should return the customer if I am its helper', async () => {
        const helper = userList[0];
        const helperToken = await getTokenByCredentials(helper.local);
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${helper.customers[0]}`,
          headers: { 'x-access-token': helperToken },
        });
        expect(res.statusCode).toBe(200);
      });

      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customersList[0]._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /customers/{id}', () => {
    const updatePayload = {
      identity: {
        firstname: 'seloger',
        lastname: 'pap',
      },
    };

    it('should update a customer', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/customers/${customersList[0]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toEqual(expect.objectContaining({
        identity: expect.objectContaining({
          firstname: updatePayload.identity.firstname,
          lastname: updatePayload.identity.lastname,
        }),
      }));
      const updatedCustomer = await Customer.findById(customersList[0]._id);
      expect(updatedCustomer).toEqual(expect.objectContaining({
        identity: expect.objectContaining({
          firstname: updatePayload.identity.firstname,
          lastname: updatePayload.identity.lastname,
        }),
      }));
    });

    it('should not create new rum if iban is set for the first time', async () => {
      const customer = customersList[2];
      const ibanPayload = { payment: { iban: 'FR2230066783676514892821545' } };
      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id}`,
        headers: { 'x-access-token': adminToken },
        payload: ibanPayload,
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.customer.payment.mandates).toBeDefined();
      expect(result.result.data.customer.payment.mandates.length).toEqual(1);
    });

    it('should create new rum if iban updated', async () => {
      const customer = customersList[1];
      const ibanPayload = { payment: { iban: 'FR2230066783676514892821545' } };
      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id}`,
        headers: { 'x-access-token': adminToken },
        payload: ibanPayload,
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.customer.payment.mandates).toBeDefined();
      expect(result.result.data.customer.payment.mandates.length).toEqual(2);
      expect(result.result.data.customer.payment.mandates[1].rum).toBeDefined();
    });

    it('should return a 404 error if no customer found', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/customers/${new ObjectID().toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      it('should update a customer if I am its helper', async () => {
        const helper = userList[0];
        const helperToken = await getTokenByCredentials(helper.local);
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${helper.customers[0]}`,
          headers: { 'x-access-token': helperToken },
          payload: {
            identity: {
              firstname: 'Volgarr',
              lastname: 'Theviking',
            },
          },
        });
        expect(res.statusCode).toBe(200);
      });

      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customersList[0]._id.toHexString()}`,
            payload: updatePayload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /customers/{id}', () => {
    it('should delete a customer without interventions', async () => {
      const deleteFileStub = sinon.stub(Drive, 'deleteFile').resolves({ id: '1234567890' });

      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[3]._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      sinon.assert.calledWith(deleteFileStub, { fileId: customersList[3].driveFolder.driveId });
      deleteFileStub.restore();
      const customers = await Customer.find({ company: authCompany._id }).lean();
      expect(customers.length).toBe(customersList.length - 1);
      const helper = await User.findById(userList[2]._id).lean();
      expect(helper).toBeNull();
    });
    it('should return a 404 error if no customer found', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 403 error if customer has interventions', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(403);
    });

    describe('Other roles', () => {
      let deleteFileStub;
      before(() => { deleteFileStub = sinon.stub(Drive, 'deleteFile').resolves({ id: '1234567890' }); });
      after(() => { deleteFileStub.restore(); });
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customersList[3]._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMER SUBSCRIPTIONS ROUTES', () => {
  let adminToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    adminToken = await getToken('admin');
  });

  describe('POST /customers/{id}/subscriptions', () => {
    it('should add subscription to customer', async () => {
      const customer = customersList[1];
      const payload = {
        service: customerServiceList[1]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
        }],
      };

      const result = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/subscriptions`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.subscriptions).toBeDefined();
      expect(result.result.data.subscriptions[0].service._id).toEqual(payload.service);
      expect(result.result.data.subscriptions[0].versions[0].unitTTCRate).toEqual(payload.versions[0].unitTTCRate);
    });

    it('should return 409 if service already subscribed', async () => {
      const customer = customersList[0];
      const payload = {
        service: customer.subscriptions[0].service,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
        }],
      };

      const result = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/subscriptions`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toBe(409);
    });

    describe('Other roles', () => {
      const payload = {
        service: customerServiceList[1]._id,
        versions: [{
          unitTTCRate: 12,
          estimatedWeeklyVolume: 12,
          evenings: 2,
          sundays: 1,
        }],
      };

      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[1]._id.toHexString()}/subscriptions`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /customers/{id}/subscriptions/{subscriptionId}', () => {
    const payload = {
      estimatedWeeklyVolume: 24,
      evenings: 3,
    };

    it('should update customer subscription', async () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/subscriptions/${subscription._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.subscriptions).toBeDefined();
      expect(result.result.data.subscriptions[0].versions).toBeDefined();
      expect(result.result.data.subscriptions[0].versions.length).toEqual(subscription.versions.length + 1);
    });

    it('should return 404 as customer not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${invalidId}/subscriptions/${subscription._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 404 as subscription not found', async () => {
      const customer = customersList[0];
      const invalidId = new ObjectID().toHexString();

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/subscriptions/${invalidId}`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customer._id.toHexString()}/subscriptions/${subscription._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /customers/{id}/subscriptions/{subscriptionId}', () => {
    it('should delete customer subscription', async () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];

      const result = await app.inject({
        method: 'DELETE',
        url: `/customers/${customer._id.toHexString()}/subscriptions/${subscription._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(result.statusCode).toBe(200);
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customer._id.toHexString()}/subscriptions/${subscription._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMER MANDATES ROUTES', () => {
  let adminToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    adminToken = await getToken('admin');
  });

  describe('GET /customers/{_id}/mandates', () => {
    it('should return customer mandates', async () => {
      const customer = customersList[1];
      const result = await app.inject({
        method: 'GET',
        url: `/customers/${customer._id}/mandates`,
        headers: { 'x-access-token': adminToken },
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.mandates).toBeDefined();
      expect(result.result.data.mandates.length).toEqual(customer.payment.mandates.length);
    });

    it('should return 404 if customer not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const result = await app.inject({
        method: 'GET',
        url: `/customers/${invalidId}/mandates`,
        headers: { 'x-access-token': adminToken },
      });

      expect(result.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const customer = customersList[1];
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customer._id}/mandates`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /customers/{_id}/mandates/{mandateId}', () => {
    it('should update customer mandate', async () => {
      const customer = customersList[1];
      const mandate = customer.payment.mandates[0];
      const payload = { signedAt: '2019-09-09T00:00:00' };

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/mandates/${mandate._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toEqual(200);
      expect(result.result.data.mandates).toBeDefined();
      expect(result.result.data.mandates[0].signedAt).toBeDefined();
    });

    it('should return 404 if customer not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const mandate = customersList[1].payment.mandates[0];
      const payload = { signedAt: '2019-09-09T00:00:00' };

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${invalidId}/mandates/${mandate._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toEqual(404);
    });

    it('should return 404 if mandate not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const customer = customersList[1];
      const payload = { signedAt: '2019-09-09T00:00:00' };

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/mandates/${invalidId}`,
        headers: { 'x-access-token': adminToken },
        payload,
      });

      expect(result.statusCode).toEqual(404);
    });

    describe('Other roles', () => {
      const customer = customersList[1];
      const mandate = customer.payment.mandates[0];
      const payload = {
        signedAt: '2019-01-18T10:00:00.000Z',
      };

      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customer._id.toHexString()}/mandates/${mandate._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST customers/:id/mandates/:id/esign', () => {
    let createDocumentStub;
    let generateDocxStub;
    let fileToBase64Stub;

    beforeEach(() => {
      createDocumentStub = sinon.stub(ESign, 'createDocument');
      generateDocxStub = sinon.stub(FileHelper, 'generateDocx');
      fileToBase64Stub = sinon.stub(FileHelper, 'fileToBase64');

      createDocumentStub.returns({
        data: {
          document_hash: 'dOcUmEnThAsH',
          signers: [{ embedded_signing_url: 'embeddedSigningUrl<->' }],
        },
      });
      generateDocxStub.returns(path.join(__dirname, 'assets/signature_request.docx'));
      fileToBase64Stub.returns('signature_request');
    });

    afterEach(() => {
      createDocumentStub.restore();
      generateDocxStub.restore();
      fileToBase64Stub.restore();
    });

    const payload = {
      fileId: process.env.ESIGN_TEST_DOC_DRIVEID,
      customer: {
        name: 'Test',
        email: 'test@test.com',
      },
      fields: {
        title: 'mrs',
        firstname: 'Test',
        lastname: 'Test',
        address: '15 rue du test',
        city: 'Test city',
        zipCode: '34000',
        birthDate: '15/07/88',
        birthCountry: 'France',
        birthState: '93',
        nationality: 'Française',
        SSN: '12345678909876543',
        grossHourlyRate: 24,
        monthlyHours: 56,
        salary: 1500,
        startDate: '18/12/2018',
        weeklyHours: 35,
        yearlyHours: 1200,
        uploadDate: '18/12/2018',
        initialContractStartDate: '16/12/2018',
      },
    };
    const customerId = customersList[1]._id.toHexString();
    const mandateId = customersList[1].payment.mandates[0]._id.toHexString();

    it('should create a mandate signature request if I am its helper', async () => {
      const helper = userList[1];
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customerId}/mandates/${mandateId}/esign`,
        headers: { 'x-access-token': helperToken },
        payload,
      });
      expect(res.statusCode).toBe(200);
      sinon.assert.calledOnce(createDocumentStub);
      sinon.assert.calledOnce(generateDocxStub);
      sinon.assert.calledOnce(fileToBase64Stub);
      expect(res.statusCode).toBe(200);
      expect(res.result.data.signatureRequest).toEqual(expect.objectContaining({
        embeddedUrl: expect.any(String),
      }));
      const customer = await Customer.findById(customerId);
      expect(customer.payment.mandates[0].everSignId).toBeDefined();
    });

    const roles = [
      { name: 'helper', expectedCode: 403, callCount: 0 },
      { name: 'admin', expectedCode: 403, callCount: 0 },
      { name: 'auxiliary', expectedCode: 403, callCount: 0 },
      { name: 'coach', expectedCode: 403, callCount: 0 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/customers/${customerId}/mandates/${mandateId}/esign`,
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CUSTOMERS QUOTES ROUTES', () => {
  let adminToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    adminToken = await getToken('admin');
  });

  describe('GET customers/:id/quotes', () => {
    it('should return customer quotes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/customers/${customersList[0]._id.toHexString()}/quotes`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.quotes).toBeDefined();
      expect(res.result.data.quotes.length).toEqual(customersList[0].quotes.length);
      expect(res.result.data.quotes[0]._id).toEqual(customersList[0].quotes[0]._id);
      expect(res.result.data.user._id).toEqual(customersList[0]._id);
    });
    it('should return 404 error if no user found', async () => {
      const invalidId = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'GET',
        url: `/customers/${invalidId}/quotes`,
        headers: { 'x-access-token': adminToken },
      });

      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customersList[0]._id.toHexString()}/quotes`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST customers/:id/quotes', () => {
    it('should create a customer quote', async () => {
      const payload = {
        subscriptions: [{
          serviceName: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3,
        }, {
          serviceName: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10,
        }],
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[1]._id.toHexString()}/quotes`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.quote).toBeDefined();
      expect(res.result.data.user._id).toEqual(customersList[1]._id);
      expect(res.result.data.quote.quoteNumber).toEqual(expect.any(String));
      expect(res.result.data.quote.subscriptions).toEqual(expect.arrayContaining([
        expect.objectContaining(payload.subscriptions[0]),
        expect.objectContaining(payload.subscriptions[1]),
      ]));
    });
    it("should return a 400 error if 'subscriptions' array is missing from payload", async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[1]._id.toHexString()}/quotes`,
        payload: {},
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(400);
    });

    describe('Other roles', () => {
      const payload = {
        subscriptions: [{
          serviceName: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3,
        }, {
          serviceName: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10,
        }],
      };

      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[1]._id.toHexString()}/quotes`,
            payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE customers/:id/quotes/:quoteId', () => {
    it('should delete a customer quote', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[0]._id.toHexString()}/quotes/${customersList[0].quotes[0]._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      const customer = await Customer.findById(customersList[0]._id);
      expect(customer.quotes.length).toBe(customersList[0].quotes.length - 1);
    });
    it('should return a 404 error if user is not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${invalidId}/quotes/${customersList[0].quotes[0]._id.toHexString()}`,
        payload: {},
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });
    it('should return a 404 error if quote does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[0]._id.toHexString()}/quotes/${invalidId}`,
        payload: {},
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customer._id.toHexString()}/quotes/${customer.quotes[0]._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS SUBSCRIPTION HISTORY ROUTES', () => {
  let helper;
  let helperToken;
  beforeEach(populateDB);
  beforeEach(async () => {
    [helper] = userList;
    helperToken = await getTokenByCredentials(helper.local);
  });

  describe('POST customers/:id/subscriptionshistory', () => {
    it('should create a customer subscription history', async () => {
      const payload = {
        subscriptions: [{
          service: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3,
        }, {
          service: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10,
        }],
        helper: {
          firstname: 'Emmanuel',
          lastname: 'Magellan',
          title: 'mrs',
        },
      };

      const res = await app.inject({
        method: 'POST',
        url: `/customers/${helper.customers[0].toHexString()}/subscriptionshistory`,
        payload,
        headers: { 'x-access-token': helperToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toBeDefined();
      expect(res.result.data.subscriptionHistory).toBeDefined();
      expect(res.result.data.customer._id).toEqual(helper.customers[0]);
      expect(res.result.data.subscriptionHistory.subscriptions).toEqual(expect.arrayContaining([
        expect.objectContaining(payload.subscriptions[0]),
        expect.objectContaining(payload.subscriptions[1]),
      ]));
      expect(res.result.data.subscriptionHistory.helper).toEqual(expect.objectContaining(payload.helper));
      expect(res.result.data.subscriptionHistory.approvalDate).toEqual(expect.any(Date));
    });

    it("should return a 400 error if 'subscriptions' array is missing from payload", async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${helper.customers[0].toHexString()}/subscriptionshistory`,
        payload: {
          helper: {
            firstname: 'Emmanuel',
            lastname: 'Magellan',
            title: 'mrs',
          },
        },
        headers: { 'x-access-token': helperToken },
      });

      expect(res.statusCode).toBe(400);
    });

    it("should return a 400 error if 'helper' object is missing from payload", async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${helper.customers[0].toHexString()}/subscriptionshistory`,
        payload: {
          subscriptions: [{
            service: 'TestTest',
            unitTTCRate: 23,
            estimatedWeeklyVolume: 3,
          }, {
            service: 'TestTest2',
            unitTTCRate: 30,
            estimatedWeeklyVolume: 10,
          }],
        },
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if user does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        subscriptions: [{
          service: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3,
        }, {
          service: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10,
        }],
        helper: {
          firstname: 'Emmanuel',
          lastname: 'Magellan',
          title: 'mrs',
        },
      };

      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${invalidId}/subscriptionshistory`,
        payload,
        headers: { 'x-access-token': helperToken },
      });

      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const payload = {
        subscriptions: [{
          service: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3,
        }, {
          service: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10,
        }],
        helper: {
          firstname: 'Lana',
          lastname: 'Wachowski',
          title: 'mrs',
        },
      };
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'admin', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[0]._id.toHexString()}/subscriptionshistory`,
            payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS FUNDINGS ROUTES', () => {
  let adminToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    adminToken = await getToken('admin');
  });

  describe('POST customers/:id/fundings', () => {
    it('should create a customer funding', async () => {
      const customer = customersList[0];
      const payload = {
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        subscription: customer.subscriptions[1]._id,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: MONTHLY,
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toBeDefined();
      expect(res.result.data.funding).toBeDefined();
      expect(res.result.data.customer._id).toEqual(customer._id);
      expect(res.result.data.funding.thirdPartyPayer.name).toEqual(customerThirdPartyPayer.name);
      expect(res.result.data.funding.nature).toEqual(payload.nature);
      expect(res.result.data.funding.subscription._id).toEqual(payload.subscription);
      expect(res.result.data.funding.versions[0]).toMatchObject(payload.versions[0]);
    });

    it('should return a 409 error if subscription is used by another funding', async () => {
      const customer = customersList[0];
      const payload = {
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        subscription: customer.subscriptions[0]._id,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: MONTHLY,
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(409);
    });

    it("should return a 400 error if 'subscriptions' array is missing from payload", async () => {
      const payload = {
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: MONTHLY,
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[0]._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(400);
    });

    it("should return a 400 error if 'thirdPartyPayer' object is missing from payload", async () => {
      const payload = {
        nature: FIXED,
        subscription: customersList[0].subscriptions[0]._id,
        versions: [{
          frequency: MONTHLY,
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          endDate: moment.utc().add(6, 'months'),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[0]._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should return a 404 error if customer does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        subscription: customersList[0].subscriptions[0]._id,
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: MONTHLY,
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };

      const res = await app.inject({
        method: 'POST',
        url: `/customers/${invalidId}/fundings`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const payload = {
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayer._id,
        subscription: customer.subscriptions[1]._id,
        versions: [{
          folderNumber: 'D123456',
          startDate: moment.utc().toDate(),
          frequency: MONTHLY,
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customer._id.toHexString()}/fundings`,
            payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT customers/:id/fundings', () => {
    it('should update a customer funding', async () => {
      const customer = customersList[0];
      const payload = {
        subscription: customer.subscriptions[0]._id,
        amountTTC: 90,
        customerParticipationRate: 20,
        frequency: MONTHLY,
        endDate: moment.utc().add(4, 'years').toDate(),
        startDate: moment.utc().add(3, 'years').toDate(),
        careDays: [1, 3],
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/fundings/${customer.fundings[0]._id.toHexString()}`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toBeDefined();
      expect(res.result.data.funding).toBeDefined();
      expect(res.result.data.customer._id).toEqual(customer._id);
      expect(res.result.data.funding.versions.length).toBe(2);
    });

    it('should return a 404 error if customer does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        subscription: customersList[0].subscriptions[0]._id,
        amountTTC: 90,
        customerParticipationRate: 20,
        frequency: MONTHLY,
        startDate: moment.utc().add(6, 'months').toDate(),
        endDate: moment.utc().add(1, 'year').toDate(),
        careDays: [1, 3],
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/customers/${invalidId}/fundings/${customersList[0].fundings[0]._id.toHexString()}`,
        payload,
        headers: { 'x-access-token': adminToken },
      });
      expect(res.statusCode).toBe(404);
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const payload = {
        subscription: customer.subscriptions[0]._id,
        amountTTC: 90,
        customerParticipationRate: 20,
        frequency: MONTHLY,
        endDate: moment.utc().add(4, 'years').toDate(),
        startDate: moment.utc().add(3, 'years').toDate(),
        careDays: [1, 3],
      };
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customer._id.toHexString()}/fundings/${customer.fundings[0]._id.toHexString()}`,
            payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /customers/{id}/fundings/{fundingId}', () => {
    it('should delete customer funding', async () => {
      const customer = customersList[0];
      const funding = customer.fundings[0];

      const result = await app.inject({
        method: 'DELETE',
        url: `/customers/${customer._id.toHexString()}/fundings/${funding._id.toHexString()}`,
        headers: { 'x-access-token': adminToken },
      });

      expect(result.statusCode).toBe(200);
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const funding = customer.fundings[0];
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customer._id.toHexString()}/fundings/${funding._id.toHexString()}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMER FILE UPLOAD ROUTES', () => {
  let adminToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    adminToken = await getToken('admin');
  });

  describe('POST /customers/:_id/gdrive/:driveId/upload', () => {
    const fakeDriveId = 'fakeDriveId';
    let addStub;
    let getFileByIdStub;

    beforeEach(() => {
      addStub = sinon.stub(Drive, 'add');
      getFileByIdStub = sinon.stub(Drive, 'getFileById');
    });

    afterEach(() => {
      addStub.restore();
      getFileByIdStub.restore();
    });

    it('should upload a signed mandate', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

      const customer = customersList[1];
      const payload = {
        fileName: 'mandat_signe',
        mandateId: customer.payment.mandates[0]._id.toHexString(),
        signedMandate: '',
      };
      const form = generateFormData(payload);

      const response = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/gdrive/${fakeDriveId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': adminToken },
      });

      expect(response.statusCode).toEqual(200);
      sinon.assert.calledOnce(addStub);
      sinon.assert.calledOnce(getFileByIdStub);
    });

    it('should upload a signed quote', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

      const customer = customersList[0];
      const payload = {
        fileName: 'devis_signe',
        quoteId: customer.quotes[0]._id.toHexString(),
        signedQuote: '',
      };
      const form = generateFormData(payload);

      const response = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/gdrive/${fakeDriveId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': adminToken },
      });

      expect(response.statusCode).toEqual(200);
      sinon.assert.calledOnce(addStub);
      sinon.assert.calledOnce(getFileByIdStub);
    });

    it('should upload a financial certificate', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

      const customer = customersList[0];
      const payload = {
        fileName: 'financialCertificate',
        financialCertificates: '',
      };
      const form = generateFormData(payload);

      const response = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/gdrive/${fakeDriveId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': adminToken },
      });

      expect(response.statusCode).toEqual(200);
      sinon.assert.calledOnce(addStub);
      sinon.assert.calledOnce(getFileByIdStub);
    });

    describe('Other roles', () => {
      const payload = {
        fileName: 'financialCertificate',
        financialCertificates: '',
      };

      it('should upload a financial certificate if I am its helper', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const helper = userList[0];
        const helperToken = await getTokenByCredentials(helper.local);
        const customerId = helper.customers[0];
        const form = generateFormData(payload);
        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customerId.toHexString()}/gdrive/${fakeDriveId}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': helperToken },
        });
        expect(res.statusCode).toBe(200);
        sinon.assert.calledOnce(addStub);
        sinon.assert.calledOnce(getFileByIdStub);
      });

      const roles = [
        { name: 'helper', expectedCode: 403, callCount: 0 },
        { name: 'auxiliary', expectedCode: 403, callCount: 0 },
        { name: 'coach', expectedCode: 200, callCount: 1 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          addStub.returns({ id: 'fakeFileDriveId' });
          getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

          const form = generateFormData(payload);
          const authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[0]._id.toHexString()}/gdrive/${fakeDriveId}/upload`,
            payload: await GetStream(form),
            headers: { ...form.getHeaders(), 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
          sinon.assert.callCount(addStub, role.callCount);
          sinon.assert.callCount(getFileByIdStub, role.callCount);
        });
      });
    });
  });
});
