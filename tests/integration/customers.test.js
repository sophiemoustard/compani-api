const expect = require('expect');
const faker = require('faker');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const _ = require('lodash');

const app = require('../../server');
const {
  populateCustomers,
  customersList
} = require('./seed/customersSeed');
const {
  populateUsers,
  getToken
} = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populateCompanies, companiesList } = require('./seed/companiesSeed');
const Customer = require('../../models/Customer');
const { MONTHLY, ONE_TIME } = require('../../helpers/constants');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMERS ROUTES', () => {
  let token = null;
  before(populateCompanies);
  beforeEach(populateCustomers);
  before(populateRoles);
  beforeEach(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });


  const payload = {
    identity: { lastname: faker.name.lastName() },
    contact: {
      ogustAddressId: faker.random.number({ max: 8 }).toString(),
      address: {
        street: faker.address.streetAddress(),
        zipCode: faker.address.zipCode(),
        city: faker.address.city()
      }
    }
  };

  describe('POST /customers', () => {
    it('should create a new customer', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/customers',
        payload,
        headers: {
          'x-access-token': token
        }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        identity: expect.objectContaining({ lastname: payload.identity.lastname }),
        contact: expect.objectContaining({
          ogustAddressId: payload.contact.ogustAddressId,
          address: expect.objectContaining({
            street: payload.contact.address.street,
            zipCode: payload.contact.address.zipCode,
            city: payload.contact.address.city
          })
        })
      }));
      expect(res.result.data.customer.payment.mandates).toBeDefined();
      expect(res.result.data.customer.payment.mandates.length).toEqual(1);
      expect(res.result.data.customer.payment.mandates[0].rum).toBeDefined();
      const customers = await Customer.find({});
      expect(customers).toHaveLength(customersList.length + 1);
    });

    const missingParams = [
      {
        paramName: 'lastname',
        payload: { ...payload },
        remove() {
          delete payload.identity[this.paramName];
        }
      },
      {
        paramName: 'ogustAddressId',
        payload: { ...payload },
        remove() {
          delete payload.contact[this.paramName];
        }
      },
      {
        paramName: 'street',
        payload: { ...payload },
        remove() {
          delete payload.contact.address[this.paramName];
        }
      },
      {
        paramName: 'zipCode',
        payload: { ...payload },
        remove() {
          delete payload.contact.address[this.paramName];
        }
      },
      {
        paramName: 'city',
        payload: { ...payload },
        remove() {
          delete payload.contact.address[this.paramName];
        }
      }
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.paramName}' parameter`, async () => {
        test.remove();
        const res = await app.inject({
          method: 'POST',
          url: '/customers',
          payload: test.payload,
          headers: {
            'x-access-token': token
          }
        });
        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('GET /customers', () => {
    it('should get all customers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/customers',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customers).toHaveLength(customersList.length);
    });
  });

  describe('GET /customers/{id}', () => {
    it('should return customer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/customers/${customersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        identity: expect.objectContaining({
          lastname: customersList[0].identity.lastname
        }),
        contact: expect.objectContaining({
          ogustAddressId: customersList[0].contact.ogustAddressId,
          address: expect.objectContaining({
            street: customersList[0].contact.address.street,
            zipCode: customersList[0].contact.address.zipCode,
            city: customersList[0].contact.address.city
          })
        }),
        followUp: expect.objectContaining({
          pathology: customersList[0].followUp.pathology,
          comments: customersList[0].followUp.comments,
          details: customersList[0].followUp.details,
          misc: customersList[0].followUp.misc,
        })
      }));
    });
    it('should return a 404 error if customer is not found', async () => {
      const id = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'GET',
        url: `/users/${id}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /customers/{id}', () => {
    const updatePayload = {
      identity: {
        firstname: faker.name.firstName(),
        lastname: faker.name.lastName()
      }
    };
    it('should update a customer', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/customers/${customersList[0]._id.toHexString()}`,
        payload: updatePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.customer).toEqual(expect.objectContaining({
        identity: expect.objectContaining({
          firstname: updatePayload.identity.firstname,
          lastname: updatePayload.identity.lastname
        })
      }));
      const updatedCustomer = await Customer.findById(customersList[0]._id);
      expect(updatedCustomer).toEqual(expect.objectContaining({
        identity: expect.objectContaining({
          firstname: updatePayload.identity.firstname,
          lastname: updatePayload.identity.lastname
        })
      }));
    });
    it('should not create new rum if iban is set for the first time', async () => {
      const customer = customersList[2];
      const ibanPayload = { payment: { iban: 'FR2230066783676514892821545' } };
      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id}`,
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /customers/{id}', () => {
    it('should delete a customer', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[0]._id.toHexString()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
    });
    it('should return a 404 error if no customer found', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

describe('CUSTOMER SUBSCRIPTIONS ROUTES', () => {
  let token = null;
  before(populateCompanies);
  beforeEach(populateCustomers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST /customers/{id}/subscriptions', () => {
    it('should add subscription to customer', async () => {
      const customer = customersList[1];
      const company = companiesList[0];
      const payload = {
        service: company.customersConfig.services[0]._id,
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
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toBe(409);
    });
  });

  describe('GET /customers/{id}/subscriptions', () => {
    it('should get customer subscriptions', async () => {
      const customer = customersList[0];

      const result = await app.inject({
        method: 'GET',
        url: `/customers/${customer._id.toHexString()}/subscriptions`,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.subscriptions).toBeDefined();
    });

    it('should return 404 as customer not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const result = await app.inject({
        method: 'GET',
        url: `/customers/${invalidId}/subscriptions`,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(404);
    });
  });

  describe('PUT /customers/{id}/subscriptions/{subscriptionId}', () => {
    const payload = {
      estimatedWeeklyVolume: 24,
      evenings: 3,
      startDate: '2019-01-18T10:07:56.707Z',
    };

    it('should update customer subscription', async () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/subscriptions/${subscription._id.toHexString()}`,
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toBe(404);
    });

    it('should return 404 as  subscription not found', async () => {
      const customer = customersList[0];
      const invalidId = new ObjectID().toHexString();

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/subscriptions/${invalidId}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toBe(404);
    });
  });

  describe('DELETE /customers/{id}/subscriptions/{subscriptionId}', () => {
    it('should delete customer subscription', async () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];

      const result = await app.inject({
        method: 'DELETE',
        url: `/customers/${customer._id.toHexString()}/subscriptions/${subscription._id.toHexString()}`,
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(200);
    });
  });
});

describe('CUSTOMER MANDATES ROUTES', () => {
  let token = null;
  before(populateCompanies);
  beforeEach(populateCustomers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('GET /customers/{_id}/mandates', () => {
    it('should return customer mandates', async () => {
      const customer = customersList[0];
      const result = await app.inject({
        method: 'GET',
        url: `/customers/${customer._id}/mandates`,
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token },
      });

      expect(result.statusCode).toBe(404);
    });
  });

  describe('PUT /customers/{_id}/mandates/{mandateId}', () => {
    it('should update customer mandate', async () => {
      const customer = customersList[0];
      const mandate = customer.payment.mandates[0];
      const payload = {
        signedAt: faker.date.past(1),
      };

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/mandates/${mandate._id.toHexString()}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(200);
      expect(result.result.data.mandates).toBeDefined();
      expect(result.result.data.mandates[0].signedAt).toBeDefined();
    });

    it('should return 404 if customer not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const mandate = customersList[0].payment.mandates[0];
      const payload = {
        signedAt: faker.date.past(1),
      };

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${invalidId}/mandates/${mandate._id.toHexString()}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(404);
    });

    it('should return 404 if mandate not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const customer = customersList[0];
      const payload = {
        signedAt: faker.date.past(1),
      };

      const result = await app.inject({
        method: 'PUT',
        url: `/customers/${customer._id.toHexString()}/mandates/${invalidId}`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toEqual(404);
    });
  });

  describe('POST customers/:id/mandates/:id/esign', () => {
    it('should create a mandate signature request', async () => {
      const payload = {
        fileId: process.env.ESIGN_TEST_DOC_DRIVEID,
        customer: {
          name: 'Test',
          email: 'test@test.com'
        },
        fields: {
          title: 'Mme',
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
          initialContractStartDate: '16/12/2018'
        }
      };
      const customerId = customersList[0]._id.toHexString();
      const mandateId = customersList[0].payment.mandates[0]._id.toHexString();
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customerId}/mandates/${mandateId}/esign`,
        payload,
        headers: { 'x-access-token': token }
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.signatureRequest).toEqual(expect.objectContaining({
        embeddedUrl: expect.any(String)
      }));
      const customer = await Customer.findById(customerId);
      expect(customer.payment.mandates[0].everSignId).toBeDefined();
    });
  });
});

describe('CUSTOMERS QUOTES ROUTES', () => {
  let token = null;
  before(populateCompanies);
  beforeEach(populateCustomers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('GET customers/:id/quotes', () => {
    it('should return customer quotes', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/customers/${customersList[0]._id.toHexString()}/quotes`,
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST customers/:id/quotes', () => {
    it('should create a customer quote', async () => {
      const payload = {
        subscriptions: [{
          serviceName: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3
        }, {
          serviceName: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10
        }]
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[1]._id.toHexString()}/quotes`,
        payload,
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.quote).toBeDefined();
      expect(res.result.data.user._id).toEqual(customersList[1]._id);
      expect(res.result.data.quote.quoteNumber).toEqual(expect.any(String));
      expect(res.result.data.quote.subscriptions).toEqual(expect.arrayContaining([
        expect.objectContaining(payload.subscriptions[0]),
        expect.objectContaining(payload.subscriptions[1])
      ]));
    });
    it("should return a 400 error if 'subscriptions' array is missing from payload", async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[1]._id.toHexString()}/quotes`,
        payload: {},
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE customers/:id/quotes/:quoteId', () => {
    it('should delete a customer quote', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[0]._id.toHexString()}/quotes/${customersList[0].quotes[0]._id.toHexString()}`,
        headers: { 'x-access-token': token },
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
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(404);
    });
    it('should return a 404 error if quote does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${customersList[0]._id.toHexString()}/quotes/${invalidId}`,
        payload: {},
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

describe('CUSTOMERS SUBSCRIPTION HISTORY ROUTES', () => {
  let token = null;
  before(populateCompanies);
  beforeEach(populateCustomers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST customers/:id/subscriptionshistory', () => {
    it('should create a customer subscription history', async () => {
      const payload = {
        subscriptions: [{
          service: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3
        }, {
          service: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10
        }],
        helper: {
          firstname: faker.name.firstName(),
          lastname: faker.name.lastName(),
          title: 'Mme'
        }
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[0]._id.toHexString()}/subscriptionshistory`,
        payload,
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.subscriptionHistory).toBeDefined();
      expect(res.result.data.user._id).toEqual(customersList[0]._id);
      expect(res.result.data.subscriptionHistory.subscriptions).toEqual(expect.arrayContaining([
        expect.objectContaining(payload.subscriptions[0]),
        expect.objectContaining(payload.subscriptions[1])
      ]));
      expect(res.result.data.subscriptionHistory.helper).toEqual(expect.objectContaining(payload.helper));
      expect(res.result.data.subscriptionHistory.approvalDate).toEqual(expect.any(Date));
    });
    it("should return a 400 error if 'subscriptions' array is missing from payload", async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[1]._id.toHexString()}/subscriptionshistory`,
        payload: {
          helper: {
            firstname: faker.name.firstName(),
            lastname: faker.name.lastName(),
            title: 'Mme'
          }
        },
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(400);
    });
    it("should return a 400 error if 'helper' object is missing from payload", async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[1]._id.toHexString()}/subscriptionshistory`,
        payload: {
          subscriptions: [{
            service: 'TestTest',
            unitTTCRate: 23,
            estimatedWeeklyVolume: 3
          }, {
            service: 'TestTest2',
            unitTTCRate: 30,
            estimatedWeeklyVolume: 10
          }]
        },
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(400);
    });
    it('should return a 404 error if user does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        subscriptions: [{
          service: 'TestTest',
          unitTTCRate: 23,
          estimatedWeeklyVolume: 3
        }, {
          service: 'TestTest2',
          unitTTCRate: 30,
          estimatedWeeklyVolume: 10
        }],
        helper: {
          firstname: faker.name.firstName(),
          lastname: faker.name.lastName(),
          title: 'Mme'
        }
      };
      const res = await app.inject({
        method: 'DELETE',
        url: `/customers/${invalidId}/subscriptionshistory`,
        payload,
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});

describe('CUSTOMERS FUNDINGS ROUTES', () => {
  let token = null;
  before(populateCompanies);
  beforeEach(populateCustomers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST customers/:id/fundings', () => {
    it('should create a customer funding', async () => {
      const payload = {
        nature: ONE_TIME,
        versions: [{
          thirdPartyPayer: companiesList[0].customersConfig.thirdPartyPayers[0]._id,
          folderNumber: 'D123456',
          frequency: MONTHLY,
          startDate: moment.utc().toDate(),
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
          subscriptions: [companiesList[0].customersConfig.services[0]._id]
        }]
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[0]._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.user).toBeDefined();
      expect(res.result.data.funding).toBeDefined();
      expect(res.result.data.user._id).toEqual(customersList[0]._id);
      expect(res.result.data.funding.versions[0]).toMatchObject({
        ..._.omit(payload.versions[0], ['thirdPartyPayer', 'subscriptions']),
        thirdPartyPayer: companiesList[0].customersConfig.thirdPartyPayers[0].name,
        subscriptions: expect.arrayContaining([expect.objectContaining({
          name: companiesList[0].customersConfig.services[0].versions[0].name
        })])
      });
    });
    it("should return a 400 error if 'subscriptions' array is missing from payload", async () => {
      const payload = {
        nature: ONE_TIME,
        versions: [{
          thirdPartyPayer: companiesList[0].customersConfig.thirdPartyPayers[0]._id,
          folderNumber: 'D123456',
          frequency: MONTHLY,
          startDate: moment.utc().toDate(),
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5]
        }]
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[0]._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(400);
    });
    it("should return a 400 error if 'thirdPartyPayer' object is missing from payload", async () => {
      const payload = {
        nature: ONE_TIME,
        versions: [{
          folderNumber: 'D123456',
          frequency: MONTHLY,
          startDate: moment.utc().toDate(),
          endDate: moment.utc().add(6, 'months'),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
          subscriptions: [companiesList[0].customersConfig.services[0]._id]
        }]
      };
      const res = await app.inject({
        method: 'POST',
        url: `/customers/${customersList[0]._id.toHexString()}/fundings`,
        payload,
        headers: { 'x-access-token': token },
      });
      expect(res.statusCode).toBe(400);
    });
    it('should return a 404 error if customer does not exist', async () => {
      const invalidId = new ObjectID().toHexString();
      const payload = {
        nature: ONE_TIME,
        versions: [{
          thirdPartyPayer: companiesList[0].customersConfig.thirdPartyPayers[0]._id,
          folderNumber: 'D123456',
          frequency: MONTHLY,
          startDate: moment.utc().toDate(),
          endDate: moment.utc().add(6, 'months').toDate(),
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
          subscriptions: [companiesList[0].customersConfig.services[0]._id]
        }]
      };
      try {
        const res = await app.inject({
          method: 'POST',
          url: `/customers/${invalidId}/fundings`,
          payload,
          headers: { 'x-access-token': token },
        });
        expect(res.statusCode).toBe(404);
      } catch (e) {
        expect(e).toBe('Error while checking subscription funding: customer not found.');
      }
    });
  });
});
