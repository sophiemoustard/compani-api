const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const app = require('../../server');
const Contract = require('../../models/Contract');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Event = require('../../models/Event');
const { getToken, userList, populateUsers } = require('./seed/usersSeed');
const { customersList, populateCustomers } = require('./seed/customersSeed');
const { populateContracts, contractsList } = require('./seed/contractsSeed');
const { populateEvents, eventsList } = require('./seed/eventsSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populateCompanies } = require('./seed/companiesSeed');
const { populateServices } = require('./seed/servicesSeed');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT } = require('../../helpers/constants');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CONTRACTS ROUTES', () => {
  let authToken = null;
  before(populateCompanies);
  before(populateServices);
  before(populateRoles);
  before(populateCustomers);
  before(populateUsers);
  beforeEach(populateEvents);
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

    it('should create contract (company contract)', async () => {
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
      const res = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload: {
          startDate: '2019-01-18T15:46:30.636Z',
          versions: [{
            grossHourlyRate: 10.43,
            startDate: '2019-01-18T15:46:30.636Z'
          }],
          user: userList[4]._id,
          status: CUSTOMER_CONTRACT,
          customer: customersList[0]._id,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.result.data.contract).toBeDefined();
      const contracts = await Contract.find({});
      expect(contracts.length).toEqual(contractsList.length + 1);
      const customer = await Customer.findOne({ _id: customersList[0]._id });
      expect(customer).toBeDefined();
      expect(customer.contracts).toContainEqual(res.result.data.contract._id);
    });

    const missingParams = [
      {
        paramName: 'startDate',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
      },
      {
        paramName: 'status',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
      },
      {
        paramName: 'grossHourlyRate',
        payload: { ...payload },
        update() {
          delete this.payload.versions[0][this.paramName];
        }
      },
      {
        paramName: 'weeklyHours',
        payload: { ...payload },
        update() {
          delete this.payload.versions[0][this.paramName];
        }
      },
      {
        paramName: 'startDate',
        payload: { ...payload },
        update() {
          delete this.payload.versions[0][this.paramName];
        }
      },
      {
        paramName: 'user',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
      },
      {
        paramName: 'customer',
        payload: { ...payload, status: CUSTOMER_CONTRACT },
        update() {
          delete this.payload[this.paramName];
        }
      }
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.paramName}' parameter`, async () => {
        test.update();
        const res = await app.inject({
          method: 'POST',
          url: '/contracts',
          payload: test.payload,
          headers: { 'x-access-token': authToken },
        });
        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('PUT contract/:id', () => {
    it('should end the contract and remove future events', async () => {
      const endDate = moment().add(1, 'd').toDate();
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
      const events = await Event.find().lean();
      expect(events.length).toBe(eventsList.length - 2);
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
