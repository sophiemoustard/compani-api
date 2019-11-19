const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const app = require('../../server');
const cloneDeep = require('lodash/cloneDeep');
const omit = require('lodash/omit');
const Contract = require('../../src/models/Contract');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');
const { populateDB, contractsList, contractUser, contractCustomer, contractEvents } = require('./seed/contractsSeed');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT } = require('../../src/helpers/constants');
const EsignHelper = require('../../src/helpers/eSign');
const { getToken, getUser, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CONTRACTS ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  describe('GET /contracts', () => {
    it('should return list of contracts', async () => {
      const userId = contractsList[0].user;
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${userId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contracts).toBeDefined();
      expect(response.result.data.contracts.length)
        .toEqual(contractsList.filter(contract => contract.user === userId).length);
    });

    it('should return the contracts owned by an auxiliary', async () => {
      const user = getUser('auxiliary');
      authToken = await getToken('auxiliary');
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${user._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contracts).toBeDefined();
      expect(response.result.data.contracts.length)
        .toBe(contractsList.filter(contract => contract.user === user._id).length);
    });

    const roles = [
      { name: 'admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const userId = contractsList[0].user;
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/contracts?user=${userId}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });

  describe('POST /contracts', () => {
    const payload = {
      status: COMPANY_CONTRACT,
      startDate: '2019-01-18T15:46:30.636Z',
      versions: [{
        weeklyHours: 24,
        grossHourlyRate: 10.43,
        startDate: '2019-01-18T15:46:30.636Z',
      }],
      user: contractUser._id,
    };

    it('should create contract (company contract)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();
      const contracts = await Contract.find({});
      expect(contracts.length).toEqual(contractsList.length + 1);
      const user = await User.findOne({ _id: payload.user });
      expect(user).toBeDefined();
      expect(user.contracts).toContainEqual(new ObjectID(response.result.data.contract._id));
      expect(user.inactivityDate).toBeNull();
    });

    it('should create contract (customer contract)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload: {
          startDate: '2019-01-18T15:46:30.636Z',
          versions: [{
            grossHourlyRate: 10.43,
            startDate: '2019-01-18T15:46:30.636Z',
          }],
          user: contractUser._id,
          status: CUSTOMER_CONTRACT,
          customer: contractCustomer._id,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();
      const contracts = await Contract.find({});
      expect(contracts.length).toEqual(contractsList.length + 1);
      const customer = await Customer.findById(contractCustomer._id);
      expect(customer).toBeDefined();
      expect(customer.contracts).toContainEqual(response.result.data.contract._id);
    });

    it('should create contract (customer contract) with signature request', async () => {
      const payloadWithSignature = {
        startDate: '2019-01-19T15:46:30.636Z',
        versions: [{
          grossHourlyRate: 10.43,
          startDate: '2019-01-19T15:46:30.636Z',
          signature: {
            templateId: '0987654321',
            title: 'mrs',
            signers: [{
              id: new ObjectID(),
              name: 'Toto',
              email: 'test@test.com',
            }, {
              id: new ObjectID(),
              name: 'Tata',
              email: 'tt@tt.com',
            }],
            meta: { auxiliaryDriveId: '1234567890' },
          },
        }],
        user: contractUser._id,
        status: CUSTOMER_CONTRACT,
        customer: contractCustomer._id,
      };

      const generateSignatureRequestStub = sinon.stub(EsignHelper, 'generateSignatureRequest');
      generateSignatureRequestStub.returns({ data: { document_hash: '1234567890' } });

      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload: payloadWithSignature,
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnce(generateSignatureRequestStub);
      generateSignatureRequestStub.restore();
      expect(response.result.data.contract).toBeDefined();
      expect(response.result.data.contract.versions[0]).toMatchObject({
        signature: { signedBy: { auxiliary: false, other: false }, eversignId: '1234567890' },
      });
    });

    const missingParams = [
      { path: 'startDate' },
      { path: 'status' },
      { path: 'versions.0.grossHourlyRate' },
      { path: 'versions.0.weeklyHours' },
      { path: 'versions.0.startDate' },
      { path: 'user' },
      {
        path: 'customer',
        payload: { ...payload, status: CUSTOMER_CONTRACT },
      },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/contracts',
          payload: omit(cloneDeep(test.payload || payload), test.path),
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(400);
      });
    });

    const roles = [
      { name: 'admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/contracts',
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });

  describe('PUT contract/:id', () => {
    it('should end the contract, unassign future interventions and remove other future events', async () => {
      const endDate = new Date('2019-07-08T14:00:18.653Z');
      const payload = { endDate };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();
      expect(response.result.data.contract.endDate).toEqual(endDate);

      const user = await User.findOne({ _id: contractsList[0].user });
      expect(user.inactivityDate).not.toBeNull();
      expect(moment(user.inactivityDate).format('YYYY-MM-DD')).toEqual(moment().add('1', 'months').startOf('M').format('YYYY-MM-DD'));
      const events = await Event.find().lean();
      expect(events.length).toBe(contractEvents.length - 1);
    });

    it('should return 404 error if no contract', async () => {
      const invalidId = new ObjectID().toHexString();
      const endDate = moment().toDate();
      const payload = { endDate };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${invalidId}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 error invalid payload', async () => {
      const endDate = moment().toDate();
      const payload = { dateEnde: endDate };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 error if contract already has an end date', async () => {
      const payload = { endDate: moment().toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[2]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    const payload = { endDate: new Date('2019-07-08T14:00:18.653Z') };
    const roles = [
      { name: 'admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/contracts/${contractsList[0]._id}`,
          payload,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });

  describe('DELETE contracts/:id', () => {
    it('should delete a contract by id', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if contract not found', async () => {
      const invalidId = new ObjectID().toHexString();
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${invalidId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    const roles = [
      { name: 'admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/contracts/${contractsList[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });

  describe('GET contracts/staff-register', () => {
    it('should return list of contracts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/contracts/staff-register',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.staffRegister).toBeDefined();
      expect(response.result.data.staffRegister.length).toEqual(contractsList.length);
    });

    const roles = [
      { name: 'admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/contracts/staff-register',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
