const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const get = require('lodash/get');
const fs = require('fs');
const GetStream = require('get-stream');
const path = require('path');
const app = require('../../server');
const cloneDeep = require('lodash/cloneDeep');
const omit = require('lodash/omit');
const Contract = require('../../src/models/Contract');
const Customer = require('../../src/models/Customer');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');
const SectorHistory = require('../../src/models/SectorHistory');
const Drive = require('../../src/models/Google/Drive');
const {
  populateDB,
  contractsList,
  contractUsers,
  contractCustomer,
  contractEvents,
  otherCompanyContract,
  customerFromOtherCompany,
  otherCompanyContractUser,
  userFromOtherCompany,
  userForContractCustomer,
} = require('./seed/contractsSeed');
const { generateFormData } = require('./utils');
const { COMPANY_CONTRACT, CUSTOMER_CONTRACT } = require('../../src/helpers/constants');
const EsignHelper = require('../../src/helpers/eSign');
const { getToken, getUser, authCompany, getTokenByCredentials } = require('./seed/authenticationSeed');

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

    it('should get contracts of an auxiliary', async () => {
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

    it('should get my contracts if I am an auxiliary without company', async () => {
      const user = getUser('auxiliary_without_company');
      authToken = await getToken('auxiliary_without_company');
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

    it('should not return the contracts if user is not from the company', async () => {
      authToken = await getToken('auxiliary');
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${userFromOtherCompany._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not return the contracts if customer is not from the company', async () => {
      authToken = await getToken('auxiliary');
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${customerFromOtherCompany._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return customer contracts if I am its helper', async () => {
      const helperToken = await getTokenByCredentials(userForContractCustomer.local);
      const res = await app.inject({
        method: 'GET',
        url: `/contracts?customer=${userForContractCustomer.customers[0]}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should not return customer contracts if it I am not its helper', async () => {
      const helperToken = await getToken('helper');
      const res = await app.inject({
        method: 'GET',
        url: `/contracts?customer=${contractCustomer._id}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(403);
    });

    it('should not return customer contracts customer does not exists', async () => {
      const helperToken = await getTokenByCredentials(userForContractCustomer.local);
      const res = await app.inject({
        method: 'GET',
        url: `/contracts?customer=${new ObjectID()}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(403);
    });

    const roles = [
      { name: 'client_admin', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 403 },
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
    it('should create contract (company contract)', async () => {
      const payload = {
        status: COMPANY_CONTRACT,
        startDate: '2019-09-01T00:00:00',
        versions: [{
          weeklyHours: 24,
          grossHourlyRate: 10.43,
          startDate: '2019-09-01T00:00:00',
        }],
        user: contractUsers[1]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();

      const contracts = await Contract.find({ company: get(response, 'result.data.contract.company') });
      expect(contracts.length).toEqual(contractsList.length + 1);

      const user = await User.findOne({ _id: contractUsers[1]._id });
      expect(user).toBeDefined();
      expect(user.contracts).toContainEqual(new ObjectID(response.result.data.contract._id));
      expect(user.inactivityDate).toBeNull();

      const sectorHistoriesLength = await SectorHistory
        .countDocuments({
          auxiliary: contractUsers[1]._id,
          company: authCompany._id,
          startDate: moment(payload.startDate).startOf('day').toDate(),
        })
        .lean();
      expect(sectorHistoriesLength).toBe(1);
    });

    it('should create new sectorhistory if auxiliary does not have sectorhistory without a startDate', async () => {
      const payload = {
        status: COMPANY_CONTRACT,
        startDate: '2019-09-01T00:00:00',
        versions: [{
          weeklyHours: 24,
          grossHourlyRate: 10.43,
          startDate: '2019-09-01T00:00:00',
        }],
        user: contractUsers[2]._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();

      const sectorHistories = await SectorHistory
        .find({ auxiliary: contractUsers[2]._id, company: authCompany._id })
        .lean();
      expect(sectorHistories.length).toBe(3);
      expect(sectorHistories[2].startDate).toEqual(moment(payload.startDate).startOf('day').toDate());
    });

    it('should create contract (customer contract)', async () => {
      const payload = {
        startDate: '2019-01-18T15:46:30.636Z',
        versions: [{
          grossHourlyRate: 10.43,
          startDate: '2019-01-18T15:46:30.636Z',
        }],
        user: contractUsers[0]._id,
        status: CUSTOMER_CONTRACT,
        customer: contractCustomer._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();

      const contracts = await Contract.find({ company: get(response, 'result.data.contract.company') });
      expect(contracts.length).toEqual(contractsList.length + 1);

      const customer = await Customer.findOne({ _id: contractCustomer._id });
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
        user: contractUsers[0]._id,
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

    it('should not create a contract if customer is not from the same company', async () => {
      const customerContractPayload = {
        startDate: '2019-01-18T15:46:30.636Z',
        versions: [{ grossHourlyRate: 10.43, startDate: '2019-01-18T15:46:30.636Z' }],
        user: contractUsers[0]._id,
        customer: customerFromOtherCompany._id,
        status: 'contract_with_customer',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        payload: customerContractPayload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should not create a contract if user is not from the same company', async () => {
      const payload = {
        status: COMPANY_CONTRACT,
        startDate: '2019-09-01T00:00:00',
        versions: [{
          weeklyHours: 24,
          grossHourlyRate: 10.43,
          startDate: '2019-09-01T00:00:00',
        }],
        user: otherCompanyContractUser._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        payload: { ...payload, user: otherCompanyContractUser._id },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    const missingParams = [
      { path: 'startDate' },
      { path: 'status' },
      { path: 'versions.0.grossHourlyRate' },
      { path: 'versions.0.weeklyHours' },
      { path: 'versions.0.startDate' },
      { path: 'user' },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if missing '${test.path}' parameter`, async () => {
        const payload = {
          status: COMPANY_CONTRACT,
          startDate: '2019-09-01T00:00:00',
          versions: [{
            weeklyHours: 24,
            grossHourlyRate: 10.43,
            startDate: '2019-09-01T00:00:00',
          }],
          user: contractUsers[1]._id,
        };
        const response = await app.inject({
          method: 'POST',
          url: '/contracts',
          payload: omit(cloneDeep(payload), test.path),
          headers: { 'x-access-token': authToken },
        });
        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 400 error if missing customer parameter for customer contract', async () => {
      const payload = {
        status: CUSTOMER_CONTRACT,
        startDate: '2019-09-01T00:00:00',
        versions: [{
          weeklyHours: 24,
          grossHourlyRate: 10.43,
          startDate: '2019-09-01T00:00:00',
        }],
        user: contractUsers[1]._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        payload,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(400);
    });

    const roles = [
      { name: 'client_admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = {
          status: COMPANY_CONTRACT,
          startDate: '2019-09-01T00:00:00',
          versions: [{
            weeklyHours: 24,
            grossHourlyRate: 10.43,
            startDate: '2019-09-01T00:00:00',
          }],
          user: contractUsers[1]._id,
        };
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
      const endDate = '2019-07-08T14:00:00.000Z';
      const payload = { endDate };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract).toBeDefined();
      expect(moment(response.result.data.contract.endDate).format('YYYY/MM/DD'))
        .toEqual(moment(endDate).format('YYYY/MM/DD'));

      const user = await User.findOne({ _id: contractsList[0].user });
      expect(user.inactivityDate).not.toBeNull();
      expect(moment(user.inactivityDate).format('YYYY-MM-DD'))
        .toEqual(moment(endDate).add('1', 'months').startOf('M').format('YYYY-MM-DD'));
      const events = await Event.find({ company: authCompany._id }).lean();
      expect(events.length).toBe(contractEvents.length - 1);
      const absence = events.find(event =>
        event.type === 'absence' && moment(event.startDate).isSame('2019-07-06', 'day'));
      expect(moment(absence.endDate).isSame('2019-07-08', 'day')).toBeTruthy();

      const sectorHistories = await SectorHistory.find({ company: authCompany._id, auxiliary: user._id }).lean();
      expect(sectorHistories[0].endDate).toEqual(moment(response.result.data.contract.endDate).endOf('day').toDate());
    });

    it('should return 403 as user and contract are not in the same company', async () => {
      const payload = { endDate: moment().toDate() };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${otherCompanyContract._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
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
      const payload = { dateEnd: endDate };
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
        url: `/contracts/${contractsList[4]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    const payload = { endDate: new Date('2019-07-08T14:00:18.653Z') };
    const roles = [
      { name: 'client_admin', expectedCode: 200 },
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

  describe('PUT contract/:id/versions/:versionId', () => {
    it('should update a contract', async () => {
      const payload = { grossHourlyRate: 8 };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[6]._id}/versions/${contractsList[6].versions[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const contract = await Contract.findById(contractsList[6]._id).lean();
      expect(contract.versions[0].grossHourlyRate).toEqual(8);
    });

    it('should update a contract startDate and update corresponding sectorhistory', async () => {
      const payload = { startDate: '2018-11-28' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[2]._id}/versions/${contractsList[2].versions[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const contract = await Contract.findById(contractsList[2]._id).lean();
      expect(moment(payload.startDate).isSame(contract.startDate, 'day')).toBeTruthy();

      const sectorHistory = await SectorHistory.findOne({ auxiliary: contract.user }).lean();
      expect(moment(payload.startDate).isSame(sectorHistory.startDate, 'day')).toBeTruthy();
    });

    it(
      'should update a contract startDate and update corresponding sectorhistory and delete unrelevant ones',
      async () => {
        const payload = { startDate: '2020-02-01' };
        const response = await app.inject({
          method: 'PUT',
          url: `/contracts/${contractsList[6]._id}/versions/${contractsList[6].versions[0]._id}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(200);
        const contract = await Contract.findById(contractsList[6]._id).lean();
        expect(moment(payload.startDate).isSame(contract.startDate, 'day')).toBeTruthy();

        const sectorHistories = await SectorHistory.find({ auxiliary: contract.user, company: authCompany._id }).lean();
        expect(sectorHistories.length).toBe(1);
        expect(moment(payload.startDate).isSame(sectorHistories[0].startDate, 'day')).toBeTruthy();
      }
    );

    it('should return a 403 if contract is not from the same company', async () => {
      const payload = { startDate: '2020-02-01' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${otherCompanyContract._id}/versions/${otherCompanyContract.versions[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if contract has an endDate', async () => {
      const payload = { startDate: '2020-02-01' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[4]._id}/versions/${contractsList[4].versions[0]._id}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    const payload = { endDate: new Date('2019-07-08T14:00:18.653Z') };
    const roles = [
      { name: 'client_admin', expectedCode: 200 },
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

  describe('DELETE contracts/:id/versions/:versionId', () => {
    it('should delete a contract version by id', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[6]._id}/versions/${contractsList[6].versions[0]._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      const sectorHistories = await SectorHistory
        .find({
          company: authCompany._id,
          auxiliary: contractsList[6].user,
        })
        .lean();

      expect(sectorHistories.length).toEqual(1);
      expect(sectorHistories.startDate).not.toBeDefined();
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

    it('should return a 403 error if versionId is not the last version', async () => {
      const invalidId = new ObjectID().toHexString();
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[0]._id}/versions/${invalidId}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    const roles = [
      { name: 'client_admin', expectedCode: 200 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/contracts/${contractsList[6]._id}/versions/${contractsList[6].versions[0]._id}`,
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
      { name: 'client_admin', expectedCode: 200 },
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

  describe('GET /{_id}/gdrive/{driveId}/upload', () => {
    const fakeDriveId = 'fakeDriveId';
    let addStub;
    let getFileByIdStub;

    beforeEach(async () => {
      addStub = sinon.stub(Drive, 'add');
      getFileByIdStub = sinon.stub(Drive, 'getFileById');
    });

    afterEach(() => {
      addStub.restore();
      getFileByIdStub.restore();
    });

    it('should upload a company contract', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
      const payload = {
        fileName: 'contrat_signe',
        file: fs.createReadStream(path.join(__dirname, 'assets/test_upload.png')),
        type: 'signedContract',
        status: COMPANY_CONTRACT,
        contractId: contractsList[0]._id.toHexString(),
        versionId: contractsList[0].versions[0]._id.toHexString(),
      };
      const form = generateFormData(payload);
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[0]._id}/gdrive/${fakeDriveId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      sinon.assert.calledOnce(addStub);
      sinon.assert.calledOnce(getFileByIdStub);
    });

    it('should upload a customer contract', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
      const payload = {
        fileName: 'contrat_signe',
        file: fs.createReadStream(path.join(__dirname, 'assets/test_upload.png')),
        type: 'signedContract',
        status: CUSTOMER_CONTRACT,
        contractId: contractsList[0]._id.toHexString(),
        versionId: contractsList[0].versions[0]._id.toHexString(),
        customer: contractCustomer._id.toHexString(),
      };
      const form = generateFormData(payload);
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[1]._id}/gdrive/${fakeDriveId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      sinon.assert.calledTwice(addStub);
      sinon.assert.calledTwice(getFileByIdStub);
    });

    it('should not upload a customer contract if customer is not from the same company', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
      const payload = {
        fileName: 'contrat_signe',
        file: fs.createReadStream(path.join(__dirname, 'assets/test_upload.png')),
        type: 'signedContract',
        status: CUSTOMER_CONTRACT,
        contractId: contractsList[0]._id.toHexString(),
        versionId: contractsList[0].versions[0]._id.toHexString(),
        customer: customerFromOtherCompany._id.toHexString(),
      };
      const form = generateFormData(payload);
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[2]._id}/gdrive/${fakeDriveId}/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(403);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const roleToken = await getToken(role.name);
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
        const payload = {
          fileName: 'contrat_signe',
          file: fs.createReadStream(path.join(__dirname, 'assets/test_upload.png')),
          type: 'signedContract',
          status: COMPANY_CONTRACT,
          contractId: contractsList[0]._id.toHexString(),
          versionId: contractsList[0].versions[0]._id.toHexString(),
        };
        const form = generateFormData(payload);
        const response = await app.inject({
          method: 'POST',
          url: `/contracts/${contractsList[0]._id}/gdrive/${fakeDriveId}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': roleToken },
        });

        expect(response.statusCode).toEqual(role.expectedCode);
      });
    });
  });
});
