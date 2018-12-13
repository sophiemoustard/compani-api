const expect = require('expect');
const faker = require('faker');
const { ObjectID } = require('mongodb');

const app = require('../server');
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
const Customer = require('../models/Customer');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
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

describe('CUSTOMERS ROUTES', () => {
  let token = null;
  before(populateCompanies);
  before(populateCustomers);
  before(populateRoles);
  before(populateUsers);
  beforeEach(async () => {
    token = await getToken();
  });

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
      expect(res.result.data.customers).toHaveLength(4);
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
  before(populateCustomers);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST /customers/{id}/subscriptions', () => {
    it('should add subscription to customer', async () => {
      const customer = customersList[1];
      const company = companiesList[0];
      const payload = {
        service: company.customersConfig.services[0]._id,
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: true,
        sundays: false,
      };

      const result = await app.inject({
        method: 'POST',
        url: `/customers/${customer._id.toHexString()}/subscriptions`,
        headers: { 'x-access-token': token },
        payload,
      });

      expect(result.statusCode).toBe(200);
      expect(result.result.data.subscriptions).toBeDefined();
      expect(result.result.data.subscriptions[0].unitTTCRate).toEqual(payload.unitTTCRate);
    });

    it('should return 409 if service already subscribed', async () => {
      const customer = customersList[0];
      const payload = {
        service: customer.subscriptions[0].service,
        unitTTCRate: 12,
        estimatedWeeklyVolume: 12,
        evenings: true,
        sundays: false,
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
      evenings: false,
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
      expect(result.result.data.subscriptions[0].estimatedWeeklyVolume).toEqual(payload.estimatedWeeklyVolume);
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
