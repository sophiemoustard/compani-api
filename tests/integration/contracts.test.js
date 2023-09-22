const { ObjectId } = require('mongodb');
const { expect } = require('expect');
const sinon = require('sinon');
const get = require('lodash/get');
const cloneDeep = require('lodash/cloneDeep');
const omit = require('lodash/omit');
const app = require('../../server');
const moment = require('../../src/extensions/moment');
const Contract = require('../../src/models/Contract');
const User = require('../../src/models/User');
const Event = require('../../src/models/Event');
const SectorHistory = require('../../src/models/SectorHistory');
const Drive = require('../../src/models/Google/Drive');
const {
  populateDB,
  contractsList,
  contractUsers,
  contractEvents,
  otherContract,
  otherContractUser,
  contractUserCompanies,
} = require('./seed/contractsSeed');
const { generateFormData, getStream } = require('./utils');
const { getToken } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
const EsignHelper = require('../../src/helpers/eSign');
const { auxiliaryWithoutCompany } = require('../seed/authUsersSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CONTRACTS ROUTES - GET /contracts', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return list of contracts', async () => {
      const userId = contractUserCompanies[1].user;
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${userId}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contracts.length)
        .toEqual(contractsList.filter(contract => contract.user === userId).length);
    });

    it('should not return the contracts if user is not from the company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${otherContractUser._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('other roles', () => {
    it('should get my contracts if I am an auxiliary without company', async () => {
      authToken = await getToken('auxiliary_without_company');
      const response = await app.inject({
        method: 'GET',
        url: `/contracts?user=${auxiliaryWithoutCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contracts.length)
        .toBe(contractsList.filter(contract => contract.user === auxiliaryWithoutCompany._id).length);
    });

    const roles = [
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/contracts?user=${contractsList[0].user}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - POST /contracts', () => {
  let authToken;
  let generateSignatureRequestStub;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
    generateSignatureRequestStub = sinon.stub(EsignHelper, 'generateSignatureRequest')
      .returns({ data: { document_hash: '1234567890' } });
  });
  afterEach(() => {
    generateSignatureRequestStub.restore();
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should create contract', async () => {
      const payload = {
        startDate: '2019-09-01T00:00:00',
        versions: [{ weeklyHours: 24, grossHourlyRate: 10.43, startDate: '2019-09-01T00:00:00' }],
        user: contractUsers[1]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.contract.serialNumber).toEqual(`CT${moment().format('YYMMDD')}0001`);

      const contractsCount = await Contract.countDocuments({ company: get(response, 'result.data.contract.company') });
      expect(contractsCount).toEqual(contractsList.length + 1);

      const user = await User.findOne({ _id: contractUsers[1]._id }).lean();
      expect(user.contracts).toContainEqual(new ObjectId(response.result.data.contract._id));
      expect(user.inactivityDate).toBeUndefined();

      const sectorHistoriesLength = await SectorHistory.countDocuments({
        auxiliary: contractUsers[1]._id,
        company: authCompany._id,
        startDate: moment(payload.startDate).startOf('day').toDate(),
      });
      expect(sectorHistoriesLength).toBe(1);
    });

    it('should create new sectorhistory if auxiliary does not have sectorhistory without a startDate', async () => {
      const payload = {
        startDate: '2020-09-01T00:00:00',
        versions: [{ weeklyHours: 24, grossHourlyRate: 10.43, startDate: '2019-09-01T00:00:00' }],
        user: contractUsers[6]._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);

      const sectorHistories = await SectorHistory
        .find({ auxiliary: contractUsers[6]._id, company: authCompany._id })
        .lean();
      expect(sectorHistories.length).toBe(2);
      expect(sectorHistories[1].startDate).toEqual(moment(payload.startDate).startOf('day').toDate());
    });

    it('should not create a contract if user is not from the same company', async () => {
      const payload = {
        startDate: '2019-09-01T00:00:00',
        versions: [{ weeklyHours: 24, grossHourlyRate: 10.43, startDate: '2019-09-01T00:00:00' }],
        user: otherContractUser._id,
      };
      const response = await app.inject({
        method: 'POST',
        url: '/contracts',
        payload: { ...payload, user: otherContractUser._id },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    const missingParams = [
      'startDate',
      'versions.0.grossHourlyRate',
      'versions.0.weeklyHours',
      'versions.0.startDate',
      'user',
    ];
    missingParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const payload = {
          startDate: '2019-09-01T00:00:00',
          versions: [{ weeklyHours: 24, grossHourlyRate: 10.43, startDate: '2019-09-01T00:00:00' }],
          user: contractUsers[1]._id,
        };
        const response = await app.inject({
          method: 'POST',
          url: '/contracts',
          payload: omit(cloneDeep(payload), param),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const payload = {
          startDate: '2019-09-01T00:00:00',
          versions: [{ weeklyHours: 24, grossHourlyRate: 10.43, startDate: '2019-09-01T00:00:00' }],
          user: contractUsers[1]._id,
        };
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/contracts',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - PUT contract/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should end the contract, unassign future interventions and remove other future events', async () => {
      const endDate = '2019-07-08T14:00:00';
      const payload = { endDate, endReason: 'mutation', endNotificationDate: '2019-07-01T14:00:00' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(moment(response.result.data.contract.endDate).format('YYYY/MM/DD'))
        .toEqual(moment(endDate).format('YYYY/MM/DD'));

      const user = await User.countDocuments({
        _id: contractsList[0].user,
        inactivityDate: moment(endDate).add('1', 'months').startOf('M').toDate(),
      });
      expect(user).toEqual(1);

      const events = await Event.find({ company: authCompany._id }).lean();
      expect(events.length).toBe(contractEvents.length - 1);
      const absence = events.find(e => e.type === 'absence' && moment(e.startDate).isSame('2019-07-06', 'day'));
      expect(moment(absence.endDate).isSame('2019-07-08', 'day')).toBeTruthy();

      const sectorHistories = await SectorHistory.countDocuments({
        company: authCompany._id,
        auxiliary: contractsList[0].user,
        endDate: moment(response.result.data.contract.endDate).endOf('day').toDate(),
      });
      expect(sectorHistories).toEqual(1);
    });

    it('should return 404 as user and contract are not in the same company', async () => {
      const payload = {
        endDate: '2019-07-08T14:00:00',
        endReason: 'mutation',
        endNotificationDate: '2019-07-01T14:00:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${otherContract._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    const missingFields = ['endDate', 'endReason', 'endNotificationDate'];
    missingFields.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const payload = {
          endDate: '2019-07-08T14:00:00',
          endReason: 'mutation',
          endNotificationDate: '2019-07-01T14:00:00',
        };

        const response = await app.inject({
          method: 'PUT',
          url: `/contracts/${contractsList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: omit(payload, param),
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 403 error if contract already has an end date', async () => {
      const payload = {
        endDate: '2019-07-08T14:00:00',
        endReason: 'mutation',
        endNotificationDate: '2019-07-01T14:00:00',
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const payload = {
          endDate: '2019-07-08T14:00:00',
          endReason: 'mutation',
          endNotificationDate: '2019-07-01T14:00:00',
        };
        const response = await app.inject({
          method: 'PUT',
          url: `/contracts/${contractsList[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - GET contract/:id/dpae', () => {
  let authToken;
  beforeEach(populateDB);
  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should export dape', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/contracts/${contractsList[0]._id}/dpae`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 as user and contract are not in the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/contracts/${otherContract._id}/dpae`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/contracts/${contractsList[0]._id}/dpae`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - POST contract/:id/versions', () => {
  let authToken;
  let generateSignatureRequest;
  beforeEach(populateDB);
  beforeEach(async () => {
    generateSignatureRequest = sinon.stub(EsignHelper, 'generateSignatureRequest');
  });
  afterEach(() => {
    generateSignatureRequest.restore();
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should create a new version', async () => {
      const payload = {
        grossHourlyRate: 35,
        startDate: '2020-10-15T00:00:00',
        weeklyHours: 24,
        signature: {
          templateId: 'lkjhgfdsaqwertyuiop',
          fields: { yearlyHours: 1820 },
          title: 'Avenant',
          signers: [{ id: '1', name: 'Toto', email: 'toto@danslavion.fr' }],
          meta: { auxiliaryDriveId: 'qwertyuiopoiuytrewq' },
          redirect: 'http://localhost/jesuisuneurl',
          redirectDecline: 'http://localhost/passympa',
        },
      };

      generateSignatureRequest.returns({ data: { document_hash: 'qwertyuio' } });
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[5]._id}/versions`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(generateSignatureRequest, payload.signature);
    });

    it('should return a 404 if contract is not from the same company', async () => {
      const payload = { grossHourlyRate: 10.12, startDate: '2020-10-15T00:00:00', weeklyHours: 24 };
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${otherContract._id}/versions`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if contract has an endDate', async () => {
      const payload = { grossHourlyRate: 10.12, startDate: '2020-10-15T00:00:00', weeklyHours: 24 };
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[1]._id}/versions`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 422 if startDate if before previous version startDate ', async () => {
      const payload = { grossHourlyRate: 10.12, startDate: '2018-07-02T00:00:00', weeklyHours: 24 };
      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[5]._id}/versions`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(422);
    });

    const missingParams = ['startDate', 'grossHourlyRate', 'weeklyHours'];
    missingParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const payload = { grossHourlyRate: 10.12, startDate: '2018-07-02T00:00:00', weeklyHours: 24 };
        const response = await app.inject({
          method: 'POST',
          url: `/contracts/${contractsList[5]._id}/versions`,
          payload: omit(cloneDeep(payload), param),
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/contracts/${contractsList[5]._id}/versions`,
          payload: { grossHourlyRate: 10.12, startDate: '2020-10-15T00:00:00', weeklyHours: 24 },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - PUT contract/:id/versions/:versionId', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update a contract startDate and update corresponding sectorhistory', async () => {
      const payload = { grossHourlyRate: 8, startDate: '2020-11-28T00:00:00' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[3]._id}/versions/${contractsList[3].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const contract = await Contract.countDocuments({
        _id: contractsList[3]._id,
        startDate: {
          $gte: moment(payload.startDate).startOf('d').toDate(),
          $lte: moment(payload.startDate).endOf('d').toDate(),
        },
      });
      expect(contract).toEqual(1);

      const sectorHistory = await SectorHistory.countDocuments({
        auxiliary: contractsList[3].user,
        startDate: {
          $gte: moment(payload.startDate).startOf('d').toDate(),
          $lte: moment(payload.startDate).endOf('d').toDate(),
        },
      });
      expect(sectorHistory).toEqual(1);
    });

    it('should update startDate, corresponding sectorhistory and delete unrelevant ones', async () => {
      const payload = { startDate: '2020-02-01' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[5]._id}/versions/${contractsList[5].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(200);
      const contract = await Contract.countDocuments({
        _id: contractsList[5]._id,
        startDate: {
          $gte: moment(payload.startDate).startOf('d').toDate(),
          $lte: moment(payload.startDate).endOf('d').toDate(),
        },
      });
      expect(contract).toEqual(1);

      const sectorHistories = await SectorHistory
        .find({ auxiliary: contractsList[5].user, company: authCompany._id })
        .lean();
      expect(sectorHistories.length).toBe(1);
      expect(moment(payload.startDate).isSame(sectorHistories[0].startDate, 'day')).toBeTruthy();
    });

    it('should return 422 if not last version updated', async () => {
      const payload = { startDate: '2020-02-01' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[4]._id}/versions/${contractsList[4].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return a 404 if contract is not from the same company', async () => {
      const payload = { startDate: '2020-02-01' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${otherContract._id}/versions/${otherContract.versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if contract has an endDate', async () => {
      const payload = { startDate: '2020-02-01' };
      const response = await app.inject({
        method: 'PUT',
        url: `/contracts/${contractsList[1]._id}/versions/${contractsList[1].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/contracts/${contractsList[5]._id}/versions/${contractsList[5].versions[0]._id}`,
          payload: { grossHourlyRate: 8 },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - DELETE contracts/:id/versions/:versionId', () => {
  let authToken;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should delete a contract if deleting last version', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[5]._id}/versions/${contractsList[5].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const sectorHistories = await SectorHistory
        .countDocuments({ company: authCompany._id, auxiliary: contractsList[5].user, startDate: { $exists: false } });
      expect(sectorHistories).toBe(1);
      const contrat = await Contract.countDocuments({ _id: contractsList[5]._id });
      expect(contrat).toBe(0);
    });

    it('should delete a contract version by id', async () => {
      const contractBefore = await Contract.findOne({ _id: contractsList[4]._id }).lean();

      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[4]._id}/versions/${contractsList[4].versions[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const contrat = await Contract.findOne({ _id: contractsList[4]._id }).lean();
      const { versions: versionsBefore } = contractBefore;
      versionsBefore.splice(versionsBefore.length - 1, 1);
      versionsBefore[versionsBefore.length - 1] = omit(versionsBefore[versionsBefore.length - 1], 'endDate');
      expect(omit(contrat, 'updatedAt')).toEqual({ ...omit(contractBefore, 'updatedAt') });
    });

    it('should return a 404 as user and contract are not in the same company', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${otherContract._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if versionId is not the last version', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[0]._id}/versions/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 as contract does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${new ObjectId()}/versions/${contractsList[0].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if contract has an endDate', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/contracts/${contractsList[1]._id}/versions/${contractsList[1].versions[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/contracts/${contractsList[5]._id}/versions/${contractsList[5].versions[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - GET contracts/staff-register', () => {
  let authToken;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('client_admin');
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should return staff-register list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/contracts/staff-register',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.staffRegister.length).toEqual(contractsList.length);
      expect(response.result.data.staffRegister[0]).toEqual(expect.objectContaining({
        _id: expect.any(ObjectId),
        serialNumber: expect.any(String),
        user: expect.objectContaining({ _id: expect.any(ObjectId) }),
        startDate: expect.any(Date),
        company: expect.any(ObjectId),
        versions: expect.any(Array),
      }));
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'helper', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/contracts/staff-register',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CONTRACTS ROUTES - GET /{_id}/gdrive/{driveId}/upload', () => {
  const fakeDriveId = 'fakeDriveId';
  let addStub;
  let getFileByIdStub;
  let authToken;
  beforeEach(populateDB);
  beforeEach(async () => {
    addStub = sinon.stub(Drive, 'add');
    getFileByIdStub = sinon.stub(Drive, 'getFileById');
  });
  afterEach(() => {
    addStub.restore();
    getFileByIdStub.restore();
  });

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should upload a contract', async () => {
      addStub.returns({ id: 'fakeFileDriveId' });
      getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
      const payload = {
        fileName: 'contrat_signe',
        file: 'test',
        type: 'signedContract',
        contractId: contractsList[0]._id.toHexString(),
        versionId: contractsList[0].versions[0]._id.toHexString(),
      };
      const form = generateFormData(payload);

      const response = await app.inject({
        method: 'POST',
        url: `/contracts/${contractsList[0]._id}/gdrive/${fakeDriveId}/upload`,
        payload: getStream(form),
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      sinon.assert.calledOnce(addStub);
      sinon.assert.calledOnce(getFileByIdStub);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
        const payload = {
          fileName: 'contrat_signe',
          file: 'test',
          type: 'signedContract',
          contractId: contractsList[0]._id.toHexString(),
          versionId: contractsList[0].versions[0]._id.toHexString(),
        };
        const form = generateFormData(payload);
        const response = await app.inject({
          method: 'POST',
          url: `/contracts/${contractsList[0]._id}/gdrive/${fakeDriveId}/upload`,
          payload: getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toEqual(role.expectedCode);
      });
    });
  });
});
