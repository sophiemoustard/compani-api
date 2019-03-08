const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const app = require('../../server');
const Contract = require('../../models/Contract');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const { getToken, userList, populateUsers } = require('./seed/usersSeed');
const { customersList, populateCustomers } = require('./seed/customersSeed');
const { populateContracts, contractsList } = require('./seed/contractsSeed');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT } = require('../../helpers/constants');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CONTRACT ROUTES', () => {
  let authToken = null;
  before(populateUsers);
  before(populateCustomers);
  beforeEach(populateContracts);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /contracts/:contractId', () => {
    it('should return contract', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/contracts/${contractsList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.contract).toBeDefined();
      expect(res.result.data.contract._id).toEqual(contractsList[0]._id);
    });

    it('should return 404 error if no contract found', async () => {
      const invalidId = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'GET',
        url: `/contracts/${invalidId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /contracts', () => {
    it('should return list of contracts', async () => {
      const userId = contractsList[0].user;
      const res = await app.inject({
        method: 'GET',
        url: `/contracts?user=${userId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.contracts).toBeDefined();
      expect(res.result.data.contracts.length)
        .toEqual(contractsList.filter(contract => contract.user === userId).length);
    });
  });

  describe('POST /contracts', () => {
    it('should create contract (company contract)', async () => {
      const payload = {
        status: COMPANY_CONTRACT,
        startDate: '2019-01-18T15:46:30.636Z',
        versions: [{
          weeklyHours: 24,
          grossHourlyRate: 10.43,
          startDate: '2019-01-18T15:46:30.636Z'
        }],
        user: userList[4]._id,
      };
      const res = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.contract).toBeDefined();
      const contracts = await Contract.find({});
      expect(contracts.length).toEqual(contractsList.length + 1);
      const user = await User.findOne({ _id: payload.user });
      expect(user).toBeDefined();
      expect(user.contracts).toContainEqual(new ObjectID(res.result.data.contract._id));
    });

    it('should create contract (customer contract)', async () => {
      const payload = {
        status: CUSTOMER_CONTRACT,
        startDate: '2019-01-18T15:46:30.636Z',
        customer: customersList[0]._id,
        versions: [{
          grossHourlyRate: 10.43,
          startDate: '2019-01-18T15:46:30.636Z'
        }],
        user: userList[4]._id,
      };
      const res = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.contract).toBeDefined();
      const contracts = await Contract.find({});
      expect(contracts.length).toEqual(contractsList.length + 1);
      const customer = await Customer.findOne({ _id: payload.customer });
      expect(customer).toBeDefined();
      expect(customer.contracts).toContainEqual(res.result.data.contract._id);
    });

    it("should return a 400 error if 'status' params is missing", async () => {
      const payload = {
        startDate: '2019-01-18T15:46:30.636Z',
        versions: [{
          weeklyHours: 24,
          grossHourlyRate: 10.43,
          startDate: '2019-01-18T15:46:30.636Z'
        }],
        user: userList[4]._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if customer params is missing for CUSTOMER_CONTRACT contract', async () => {
      const payload = {
        status: CUSTOMER_CONTRACT,
        startDate: '2019-01-18T15:46:30.636Z',
        versions: [{
          startDate: '2019-01-18T15:46:30.636Z'
        }],
        user: userList[4]._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error if grossHourlyRate params is missing for COMPANY_CONTRACT contract', async () => {
      const payload = {
        status: COMPANY_CONTRACT,
        startDate: '2019-01-18T15:46:30.636Z',
        versions: [{
          weeklyHours: 24,
          startDate: '2019-01-18T15:46:30.636Z'
        }],
        user: userList[4]._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT contract/:id', () => {
    it('should end the contract', async () => {
      const endDate = moment().toDate();
      const payload = { endDate };
      const res = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.contract).toBeDefined();
      expect(res.result.data.contract.endDate).toEqual(endDate);

      const user = await User.findOne({ _id: contractsList[0].user });
      expect(user.inactivityDate).not.toBeNull();
      expect(moment(user.inactivityDate).format('YYYY-MM-DD')).toEqual(moment().add('1', 'months').startOf('M').format('YYYY-MM-DD'));
    });

    it('should return 404 error if no contract', async () => {
      const invalidId = new ObjectID().toHexString();
      const endDate = moment().toDate();
      const payload = { endDate };
      const res = await app.inject({
        method: 'PUT',
        url: `/contracts/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 error invalid payload', async () => {
      const endDate = moment().toDate();
      const payload = { dateEnde: endDate };
      const res = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE contracts/:id', () => {
    it('should delete a contract by id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should return a 404 error if contract not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const res = await app.inject({
        method: 'DELETE',
        url: `/contracts/${invalidId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
