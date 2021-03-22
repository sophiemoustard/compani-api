const sinon = require('sinon');
const expect = require('expect');
const flat = require('flat');
const { ObjectID } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const EventHelper = require('../../../src/helpers/events');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');
const ContractHelper = require('../../../src/helpers/contracts');
const UtilsHelper = require('../../../src/helpers/utils');
const ESignHelper = require('../../../src/helpers/eSign');
const ReferentHistoryHelper = require('../../../src/helpers/referentHistories');
const UserHelper = require('../../../src/helpers/users');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const { RESIGNATION, AUXILIARY } = require('../../../src/helpers/constants');
const Contract = require('../../../src/models/Contract');
const Role = require('../../../src/models/Role');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const EventRepository = require('../../../src/repositories/EventRepository');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const SinonMongoose = require('../sinonMongoose');

require('sinon-mongoose');

describe('getContractList', () => {
  const contracts = [{ _id: new ObjectID() }];
  let findContract;
  beforeEach(() => {
    findContract = sinon.stub(Contract, 'find');
  });
  afterEach(() => {
    findContract.restore();
  });

  it('should return contract list', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const query = { user: '1234567890' };

    findContract.returns(SinonMongoose.stubChainedQueries([contracts]));

    const result = await ContractHelper.getContractList(query, credentials);
    expect(result).toEqual(contracts);

    SinonMongoose.calledWithExactly(findContract, [
      { query: 'find', args: [{ $and: [{ company: '1234567890' }, { user: '1234567890' }] }] },
      {
        query: 'populate',
        args: [
          {
            path: 'user',
            select: 'identity administrative.driveFolder sector contact local',
            populate: { path: 'sector', select: '_id sector', match: { company: credentials.company._id } },
          },
        ],
      },
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
  });

  it('should format query with dates', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const query = { startDate: '2019-09-09T00:00:00', endDate: '2019-09-09T00:00:00' };

    findContract.returns(SinonMongoose.stubChainedQueries([contracts]));

    const result = await ContractHelper.getContractList(query, credentials);
    expect(result).toEqual(contracts);

    SinonMongoose.calledWithExactly(findContract, [
      { query: 'find',
        args: [
          {
            $and: [
              { company: '1234567890' },
              {
                $or: [
                  {
                    versions: {
                      $elemMatch: { startDate: { $gte: '2019-09-09T00:00:00', $lte: '2019-09-09T00:00:00' } },
                    },
                  },
                  { endDate: { $gte: '2019-09-09T00:00:00', $lte: '2019-09-09T00:00:00' } },
                ],
              },
            ],
          },
        ] },
    ]);
  });
});

describe('allContractsEnded', () => {
  let getUserContracts;
  beforeEach(() => {
    getUserContracts = sinon.stub(ContractRepository, 'getUserContracts');
  });
  afterEach(() => {
    getUserContracts.restore();
  });

  it('should return true if contract not ended', async () => {
    const companyId = new ObjectID();
    const contract = { user: new ObjectID(), startDate: '2020-01-15T00:00:00' };
    getUserContracts.returns([
      { _id: new ObjectID() },
      { _id: new ObjectID(), endDate: '2019-02-01T23:59:59' },
    ]);
    const result = await ContractHelper.allContractsEnded(contract, companyId);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(getUserContracts, contract.user, companyId);
  });
  it('should return true if contract startDate before existing contracts end date', async () => {
    const companyId = new ObjectID();
    const contract = { user: new ObjectID(), startDate: '2020-01-15T00:00:00' };
    getUserContracts.returns([
      { _id: new ObjectID(), endDate: '2020-02-01T23:59:59' },
      { _id: new ObjectID(), endDate: '2019-02-01T23:59:59' },
    ]);
    const result = await ContractHelper.allContractsEnded(contract, companyId);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(getUserContracts, contract.user, companyId);
  });
  it('should return false if no contract', async () => {
    const companyId = new ObjectID();
    const contract = { user: new ObjectID() };
    getUserContracts.returns([]);
    const result = await ContractHelper.allContractsEnded(contract, companyId);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(getUserContracts, contract.user, companyId);
  });
  it('should return false if startDate after existing contracts end date', async () => {
    const companyId = new ObjectID();
    const contract = { user: new ObjectID(), startDate: '2020-04-15T00:00:00' };
    getUserContracts.returns([
      { _id: new ObjectID(), endDate: '2019-02-01T23:59:59' },
      { _id: new ObjectID(), endDate: '2020-02-01T23:59:59' },
    ]);
    const result = await ContractHelper.allContractsEnded(contract, companyId);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(getUserContracts, contract.user, companyId);
  });
});

describe('isCreationAllowed', () => {
  let allContractsEnded;
  beforeEach(() => {
    allContractsEnded = sinon.stub(ContractHelper, 'allContractsEnded');
  });
  afterEach(() => {
    allContractsEnded.restore();
  });

  it('should return false if not ended contract', async () => {
    const userId = new ObjectID();
    const contract = { user: userId };
    const user = { _id: userId, contractCreationMissingInfo: [] };
    allContractsEnded.returns(false);

    const result = await ContractHelper.isCreationAllowed(contract, user, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(allContractsEnded, contract, '1234567890');
  });
  it('should return false if user does not have mandatoy info', async () => {
    const userId = new ObjectID();
    const contract = { user: userId };
    const user = { _id: new ObjectID(), contractCreationMissingInfo: ['establishment'] };
    allContractsEnded.returns(true);

    const result = await ContractHelper.isCreationAllowed(contract, user, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(allContractsEnded, contract, '1234567890');
  });
  it('should return true if all contract ended and user has mandatoy info', async () => {
    const userId = new ObjectID();
    const contract = { user: userId };
    const user = { _id: new ObjectID(), contractCreationMissingInfo: [] };
    allContractsEnded.returns(true);

    const result = await ContractHelper.isCreationAllowed(contract, user, '1234567890');

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(allContractsEnded, contract, '1234567890');
  });
});

describe('createContract', () => {
  let isCreationAllowed;
  let createContract;
  let findOneUser;
  let updateOneUser;
  let findOneRole;
  let generateSignatureRequestStub;
  let createHistoryOnContractCreation;
  let formatSerialNumber;

  beforeEach(() => {
    isCreationAllowed = sinon.stub(ContractHelper, 'isCreationAllowed');
    formatSerialNumber = sinon.stub(ContractHelper, 'formatSerialNumber');
    generateSignatureRequestStub = sinon.stub(ESignHelper, 'generateSignatureRequest');
    createHistoryOnContractCreation = sinon.stub(SectorHistoryHelper, 'createHistoryOnContractCreation');
    createContract = sinon.stub(Contract, 'create');
    findOneUser = sinon.stub(User, 'findOne');
    updateOneUser = sinon.stub(User, 'updateOne');
    findOneRole = sinon.stub(Role, 'findOne');
  });

  afterEach(() => {
    isCreationAllowed.restore();
    formatSerialNumber.restore();
    generateSignatureRequestStub.restore();
    createHistoryOnContractCreation.restore();
    createContract.restore();
    findOneUser.restore();
    updateOneUser.restore();
    findOneRole.restore();
  });

  it('should create a new contract', async () => {
    const payload = {
      _id: new ObjectID(),
      endDate: null,
      user: new ObjectID(),
      startDate: moment('2018-12-03T23:00:00').toDate(),
      versions: [{ weeklyHours: 18, grossHourlyRate: 25 }],
    };
    const credentials = { company: { _id: '1234567890' } };
    const role = { _id: new ObjectID(), interface: 'client' };
    const user = { name: 'toto', contracts: [] };
    const contract = { ...payload, company: '1234567890', serialNumber: 'CT1234567890' };

    isCreationAllowed.returns(true);
    formatSerialNumber.returns('CT1234567890');

    createContract.returns(contract);
    findOneRole.returns(SinonMongoose.stubChainedQueries([role], ['lean']));
    findOneUser.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await ContractHelper.createContract(payload, credentials);

    sinon.assert.notCalled(generateSignatureRequestStub);
    sinon.assert.calledWithExactly(isCreationAllowed, payload, user, '1234567890');
    sinon.assert.calledWithExactly(formatSerialNumber, '1234567890');
    sinon.assert.notCalled(createHistoryOnContractCreation);
    sinon.assert.calledWithExactly(createContract, contract);
    sinon.assert.calledOnceWithExactly(
      updateOneUser,
      { _id: payload.user },
      { $push: { contracts: payload._id }, $unset: { inactivityDate: '' }, $set: { 'role.client': role._id } }
    );
    SinonMongoose.calledWithExactly(findOneRole, [
      { query: 'findOne', args: [{ name: AUXILIARY }, { _id: 1, interface: 1 }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneUser, [
      { query: 'findOne', args: [{ _id: payload.user }] },
      { query: 'populate', args: [{ path: 'sector', match: { company: credentials.company._id } }] },
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
    expect(result).toEqual(expect.objectContaining(contract));
  });

  it('should create a new contract and generate a signature request', async () => {
    const payload = {
      _id: new ObjectID(),
      endDate: null,
      user: new ObjectID(),
      startDate: moment('2018-12-03T23:00:00').toDate(),
      versions: [
        {
          weeklyHours: 18,
          grossHourlyRate: 25,
          signature: { templateId: '0987654321', title: 'Test' },
        },
      ],
    };
    const credentials = { company: { _id: '1234567890' } };
    const contract = { ...payload, company: '1234567890', serialNumber: 'CT1234567890' };
    const user = { name: 'Toto', contracts: [] };
    const contractWithDoc = {
      ...contract,
      versions: [{ ...contract.versions[0], signature: { eversignId: '1234567890' } }],
    };
    const role = { _id: new ObjectID(), interface: 'client' };

    isCreationAllowed.returns(true);
    formatSerialNumber.returns('CT1234567890');
    generateSignatureRequestStub.returns({ data: { document_hash: '1234567890' } });

    createContract.returns(contractWithDoc);
    findOneRole.returns(SinonMongoose.stubChainedQueries([role], ['lean']));
    findOneUser.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await ContractHelper.createContract(payload, credentials);

    sinon.assert.calledWithExactly(generateSignatureRequestStub, contract.versions[0].signature);
    sinon.assert.calledWithExactly(formatSerialNumber, '1234567890');
    sinon.assert.notCalled(createHistoryOnContractCreation);
    sinon.assert.calledWithExactly(isCreationAllowed, payload, user, '1234567890');
    sinon.assert.calledWithExactly(createContract, contractWithDoc);
    sinon.assert.calledOnceWithExactly(
      updateOneUser,
      { _id: payload.user },
      { $push: { contracts: payload._id }, $unset: { inactivityDate: '' }, $set: { 'role.client': role._id } }
    );
    SinonMongoose.calledWithExactly(findOneRole, [
      { query: 'findOne', args: [{ name: AUXILIARY }, { _id: 1, interface: 1 }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneUser, [
      { query: 'findOne', args: [{ _id: payload.user }] },
      { query: 'populate', args: [{ path: 'sector', match: { company: credentials.company._id } }] },
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
    expect(result).toEqual(expect.objectContaining(contractWithDoc));
  });

  it('should create a new contract and create sector history', async () => {
    const payload = {
      _id: new ObjectID(),
      endDate: null,
      user: new ObjectID(),
      startDate: moment('2018-12-03T23:00:00').toDate(),
      versions: [{ weeklyHours: 18, grossHourlyRate: 25 }],
    };
    const credentials = { company: { _id: '1234567890' } };
    const contract = { ...payload, company: '1234567890', serialNumber: 'CT1234567890' };
    const role = { _id: new ObjectID(), interface: 'client' };
    const user = {
      name: 'toto',
      sector: new ObjectID(),
      _id: new ObjectID(),
      contracts: [],
    };

    isCreationAllowed.returns(true);
    formatSerialNumber.returns('CT1234567890');

    createContract.returns(contract);
    findOneRole.returns(SinonMongoose.stubChainedQueries([role], ['lean']));
    findOneUser.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await ContractHelper.createContract(payload, credentials);

    expect(result).toEqual(expect.objectContaining(contract));
    sinon.assert.notCalled(generateSignatureRequestStub);
    sinon.assert.calledWithExactly(isCreationAllowed, payload, user, '1234567890');
    sinon.assert.calledWithExactly(formatSerialNumber, '1234567890');
    sinon.assert.calledWithExactly(createHistoryOnContractCreation, user, contract, credentials.company._id);
    sinon.assert.calledWithExactly(createContract, contract);
    sinon.assert.calledOnceWithExactly(
      updateOneUser,
      { _id: payload.user },
      { $push: { contracts: payload._id }, $unset: { inactivityDate: '' }, $set: { 'role.client': role._id } }
    );
    SinonMongoose.calledWithExactly(findOneRole, [
      { query: 'findOne', args: [{ name: AUXILIARY }, { _id: 1, interface: 1 }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneUser, [
      { query: 'findOne', args: [{ _id: payload.user }] },
      { query: 'populate', args: [{ path: 'sector', match: { company: credentials.company._id } }] },
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
  });

  it('should throw a 400 error if new contract startDate is before last ended contract', async () => {
    const payload = {
      _id: new ObjectID(),
      endDate: null,
      user: new ObjectID(),
      startDate: moment('2018-12-03T23:00:00').toDate(),
      versions: [{ weeklyHours: 18, grossHourlyRate: 25 }],
    };
    const credentials = { company: { _id: '1234567890' } };
    const user = { name: 'Toto' };

    try {
      isCreationAllowed.returns(false);

      findOneUser.returns(SinonMongoose.stubChainedQueries([user]));
      await ContractHelper.createContract(payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      sinon.assert.calledWithExactly(isCreationAllowed, payload, user, '1234567890');
      sinon.assert.notCalled(generateSignatureRequestStub);
      sinon.assert.notCalled(createHistoryOnContractCreation);
      sinon.assert.notCalled(formatSerialNumber);
      sinon.assert.notCalled(updateOneUser);
      sinon.assert.notCalled(findOneRole);
      sinon.assert.notCalled(createContract);
      SinonMongoose.calledWithExactly(findOneUser, [
        { query: 'findOne', args: [{ _id: payload.user }] },
        { query: 'populate', args: [{ path: 'sector', match: { company: credentials.company._id } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]);
    }
  });
});

describe('endContract', () => {
  let findOneContract;
  let findOneAndUpdateContract;
  let updateUserInactivityDate;
  let removeRepetitionsOnContractEnd;
  let unassignInterventionsOnContractEnd;
  let removeEventsExceptInterventionsOnContractEnd;
  let updateAbsencesOnContractEnd;
  let unassignReferentOnContractEnd;
  let updateEndDateStub;
  beforeEach(() => {
    findOneContract = sinon.stub(Contract, 'findOne');
    findOneAndUpdateContract = sinon.stub(Contract, 'findOneAndUpdate');
    updateUserInactivityDate = sinon.stub(UserHelper, 'updateUserInactivityDate');
    removeRepetitionsOnContractEnd = sinon.stub(EventHelper, 'removeRepetitionsOnContractEnd');
    unassignInterventionsOnContractEnd = sinon.stub(EventHelper, 'unassignInterventionsOnContractEnd');
    removeEventsExceptInterventionsOnContractEnd = sinon.stub(
      EventHelper,
      'removeEventsExceptInterventionsOnContractEnd'
    );
    updateAbsencesOnContractEnd = sinon.stub(EventHelper, 'updateAbsencesOnContractEnd');
    unassignReferentOnContractEnd = sinon.stub(ReferentHistoryHelper, 'unassignReferentOnContractEnd');
    updateEndDateStub = sinon.stub(SectorHistoryHelper, 'updateEndDate');
  });
  afterEach(() => {
    findOneContract.restore();
    findOneAndUpdateContract.restore();
    updateUserInactivityDate.restore();
    removeRepetitionsOnContractEnd.restore();
    unassignInterventionsOnContractEnd.restore();
    removeEventsExceptInterventionsOnContractEnd.restore();
    updateAbsencesOnContractEnd.restore();
    unassignReferentOnContractEnd.restore();
    updateEndDateStub.restore();
  });

  it('should end contract', async () => {
    const payload = {
      endDate: '2018-12-06T23:00:00',
      endNotificationDate: '2018-12-02T23:00:00',
      endReason: RESIGNATION,
      otherMisc: 'test',
    };
    const contract = {
      _id: new ObjectID(),
      endDate: null,
      user: new ObjectID(),
      startDate: '2018-12-03T23:00:00',
      versions: [{ _id: new ObjectID(), startDate: '2018-12-03T23:00:00' }],
    };
    const updatedContract = {
      ...contract,
      ...payload,
      user: { _id: new ObjectID(), sector: new ObjectID() },
      versions: [{ ...contract.versions[0], endDate: payload.endDate }],
    };
    const credentials = { _id: new ObjectID(), company: { _id: '1234567890' } };

    findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
    findOneAndUpdateContract.returns(SinonMongoose.stubChainedQueries([updatedContract]));

    const result = await ContractHelper.endContract(contract._id.toHexString(), payload, credentials);

    sinon.assert.calledWithExactly(updateUserInactivityDate, updatedContract.user._id, payload.endDate, credentials);
    sinon.assert.calledWithExactly(removeRepetitionsOnContractEnd, updatedContract);
    sinon.assert.calledWithExactly(unassignInterventionsOnContractEnd, updatedContract, credentials);
    sinon.assert.calledWithExactly(unassignReferentOnContractEnd, updatedContract);
    sinon.assert.calledWithExactly(removeEventsExceptInterventionsOnContractEnd, updatedContract, credentials);
    sinon.assert.calledWithExactly(
      updateAbsencesOnContractEnd,
      updatedContract.user._id,
      updatedContract.endDate,
      credentials
    );
    sinon.assert.calledWithExactly(updateEndDateStub, updatedContract.user._id, updatedContract.endDate);
    expect(result).toMatchObject(updatedContract);

    SinonMongoose.calledWithExactly(findOneContract, [
      { query: 'findOne', args: [{ _id: contract._id.toHexString() }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneAndUpdateContract, [
      {
        query: 'findOneAndUpdate',
        args: [
          { _id: contract._id.toHexString() },
          { $set: flat({ ...payload, [`versions.${contract.versions.length - 1}.endDate`]: payload.endDate }) },
          { new: true }],
      },
      {
        query: 'populate',
        args: [
          {
            path: 'user',
            select: 'sector',
            populate: { path: 'sector', select: '_id sector', match: { company: credentials.company._id } },
          },
        ],
      },
      { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
    ]);
  });

  it('should throw an error if contract end date is before last version start date', async () => {
    const contractId = new ObjectID();
    const payload = {
      endDate: '2018-12-03T23:00:00',
      endNotificationDate: '2018-12-02T23:00:00',
      endReason: RESIGNATION,
      otherMisc: 'test',
    };
    const contract = {
      _id: new ObjectID(),
      endDate: null,
      user: new ObjectID(),
      startDate: '2018-12-05T23:00:00',
      versions: [{ _id: new ObjectID(), startDate: '2018-12-05T23:00:00' }],
    };
    const credentials = { _id: new ObjectID(), company: { _id: '1234567890' } };
    try {
      findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));

      await ContractHelper.endContract(contractId.toHexString(), payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.notCalled(updateUserInactivityDate);
      sinon.assert.notCalled(removeRepetitionsOnContractEnd);
      sinon.assert.notCalled(unassignInterventionsOnContractEnd);
      sinon.assert.notCalled(unassignReferentOnContractEnd);
      sinon.assert.notCalled(removeEventsExceptInterventionsOnContractEnd);
      sinon.assert.notCalled(updateAbsencesOnContractEnd);
      sinon.assert.notCalled(updateEndDateStub);
      sinon.assert.notCalled(findOneAndUpdateContract);
      SinonMongoose.calledWithExactly(findOneContract, [
        { query: 'findOne', args: [{ _id: contractId.toHexString() }] },
        { query: 'lean' },
      ]);
    }
  });
});

describe('createVersion', () => {
  let generateSignatureRequest;
  let findOneContract;
  let updateOneContract;
  let findOneAndUpdateContract;
  let canCreateVersion;
  beforeEach(() => {
    generateSignatureRequest = sinon.stub(ESignHelper, 'generateSignatureRequest');
    findOneContract = sinon.stub(Contract, 'findOne');
    updateOneContract = sinon.stub(Contract, 'updateOne');
    findOneAndUpdateContract = sinon.stub(Contract, 'findOneAndUpdate');
    canCreateVersion = sinon.stub(ContractHelper, 'canCreateVersion');
  });
  afterEach(() => {
    generateSignatureRequest.restore();
    canCreateVersion.restore();
    findOneContract.restore();
    updateOneContract.restore();
    findOneAndUpdateContract.restore();
  });

  it('should create version and update previous one', async () => {
    const newVersion = { startDate: new Date('2019-09-13T00:00:00') };
    const contract = {
      _id: new ObjectID(),
      startDate: '2019-09-09T00:00:00',
      versions: [{ startDate: '2019-09-01T00:00:00' }, { startDate: '2019-09-10T00:00:00' }],
    };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
    findOneAndUpdateContract.returns(SinonMongoose.stubChainedQueries([], ['lean']));
    canCreateVersion.returns(true);

    await ContractHelper.createVersion(contract._id.toHexString(), newVersion, credentials);

    SinonMongoose.calledWithExactly(
      findOneContract,
      [{ query: 'findOne', args: [{ _id: contract._id.toHexString() }] }]
    );
    sinon.assert.calledOnceWithExactly(
      updateOneContract,
      { _id: contract._id.toHexString() },
      { $set: { [`versions.${1}.endDate`]: moment('2019-09-13T00:00:00').subtract(1, 'd').endOf('d').toISOString() } }
    );
    SinonMongoose.calledWithExactly(
      findOneAndUpdateContract,
      [{ query: 'findOneAndUpdate', args: [{ _id: contract._id.toHexString() }, { $push: { versions: newVersion } }] }]
    );
    sinon.assert.notCalled(generateSignatureRequest);
    sinon.assert.calledOnceWithExactly(canCreateVersion, contract, newVersion, companyId);
  });

  it('should generate signature request', async () => {
    const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
    const contract = { _id: new ObjectID(), startDate: '2019-09-09T00:00:00' };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    generateSignatureRequest.returns({ data: { document_hash: '1234567890' } });
    canCreateVersion.returns(true);
    findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
    findOneAndUpdateContract.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    await ContractHelper.createVersion(contract._id.toHexString(), newVersion, credentials);

    SinonMongoose.calledWithExactly(
      findOneContract,
      [{ query: 'findOne', args: [{ _id: contract._id.toHexString() }] }]
    );
    SinonMongoose.calledWithExactly(
      findOneAndUpdateContract,
      [{
        query: 'findOneAndUpdate',
        args: [
          { _id: contract._id.toHexString() },
          { $push: { versions: { ...newVersion, signature: { eversignId: '1234567890' } } } },
        ],
      }]
    );
    sinon.assert.calledOnceWithExactly(generateSignatureRequest, { templateId: '1234567890' });
    sinon.assert.calledOnceWithExactly(canCreateVersion, contract, newVersion, companyId);
    sinon.assert.notCalled(updateOneContract);
  });

  it('should throw on signature generation error', async () => {
    const contract = { _id: new ObjectID(), startDate: '2019-09-09T00:00:00' };
    const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    try {
      findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
      generateSignatureRequest.returns({ data: { error: { type: '1234567890' } } });
      canCreateVersion.returns(true);

      await ContractHelper.createVersion(contract._id.toHexString(), newVersion, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(400);
    } finally {
      SinonMongoose.calledWithExactly(
        findOneContract,
        [{ query: 'findOne', args: [{ _id: contract._id.toHexString() }] }]
      );
      sinon.assert.calledOnceWithExactly(canCreateVersion, contract, newVersion, companyId);
      sinon.assert.calledWithExactly(generateSignatureRequest, { templateId: '1234567890' });
      sinon.assert.notCalled(updateOneContract);
      sinon.assert.notCalled(findOneAndUpdateContract);
    }
  });

  it('should throw if creation not allowed', async () => {
    const contract = { _id: new ObjectID(), startDate: '2019-09-09T00:00:00' };
    const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    try {
      findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
      canCreateVersion.returns(false);

      await ContractHelper.createVersion(contract._id.toHexString(), newVersion, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      sinon.assert.calledOnceWithExactly(canCreateVersion, contract, newVersion, companyId);
      sinon.assert.notCalled(generateSignatureRequest);
      sinon.assert.notCalled(updateOneContract);
      sinon.assert.notCalled(findOneAndUpdateContract);
    }
  });
});

describe('canUpdateVersion', () => {
  let countAuxiliaryEventsBetweenDates;
  let findContract;
  beforeEach(() => {
    countAuxiliaryEventsBetweenDates = sinon.stub(EventRepository, 'countAuxiliaryEventsBetweenDates');
    findContract = sinon.stub(Contract, 'find');
  });
  afterEach(() => {
    countAuxiliaryEventsBetweenDates.restore();
    findContract.restore();
  });

  it('should return false if contract is ended', async () => {
    const contract = { _id: new ObjectID(), endDate: '2020-08-12T00:00:00', versions: [{ _id: new ObjectID() }] };
    const versionToUpdate = { startDate: '2020-12-03T00:00:00' };
    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 1, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.notCalled(countAuxiliaryEventsBetweenDates);
    sinon.assert.notCalled(findContract);
  });

  it('should return false if not last version', async () => {
    const versionToUpdate = { startDate: '2020-01-03T00:00:00' };
    const contract = {
      _id: new ObjectID(),
      versions: [versionToUpdate, { startDate: '2019-09-03T00:00:00', endDate: '2019-12-03T00:00:00' }],
    };
    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 0, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.notCalled(countAuxiliaryEventsBetweenDates);
    sinon.assert.notCalled(findContract);
  });

  it('should return true if contract not ended and start date is after previous version startDate', async () => {
    const versionToUpdate = { startDate: '2020-12-03T00:00:00' };
    const contract = { _id: new ObjectID(), versions: [{ startDate: '2020-09-03T00:00:00' }, versionToUpdate] };
    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 1, '1234567890');

    expect(result).toBeTruthy();
    sinon.assert.notCalled(countAuxiliaryEventsBetweenDates);
    sinon.assert.notCalled(findContract);
  });

  it('should return false if contract not ended and start date is before previous version startDate', async () => {
    const versionToUpdate = { startDate: '2018-01-03T00:00:00' };
    const contract = {
      _id: new ObjectID(),
      versions: [{ startDate: '2019-09-03T00:00:00', endDate: '2019-12-03T00:00:00' }, versionToUpdate],
    };
    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 1, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.notCalled(countAuxiliaryEventsBetweenDates);
    sinon.assert.notCalled(findContract);
  });

  it('should return false if  start date is before previous contract startDate', async () => {
    const versionToUpdate = { startDate: '2018-01-03T00:00:00' };
    const contract = {
      _id: new ObjectID(),
      versions: [{ startDate: '2019-09-03T00:00:00', endDate: '2019-12-03T00:00:00' }, versionToUpdate],
    };
    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 1, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.notCalled(countAuxiliaryEventsBetweenDates);
    sinon.assert.notCalled(findContract);
  });

  it('should return true if first version and no event', async () => {
    const contract = { _id: new ObjectID(), user: new ObjectID(), versions: [{ _id: new ObjectID() }] };
    const versionToUpdate = { startDate: '2020-08-02T00:00:00' };

    countAuxiliaryEventsBetweenDates.returns(0);
    findContract.returns(SinonMongoose.stubChainedQueries([[contract]], ['sort', 'lean']));

    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 0, '1234567890');

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(
      countAuxiliaryEventsBetweenDates,
      { auxiliary: contract.user, endDate: versionToUpdate.startDate, company: '1234567890' }
    );
    SinonMongoose.calledWithExactly(findContract, [
      { query: 'find', args: [{ company: '1234567890', user: contract.user }] },
      { query: 'sort', args: [{ startDate: -1 }] },
      { query: 'lean' },
    ]);
  });

  it('should return true if first version and no event since last contract', async () => {
    const contract = {
      _id: new ObjectID(),
      user: new ObjectID(),
      startDate: '2020-06-02T00:00:00',
      versions: [{ _id: new ObjectID() }],
    };
    const versionToUpdate = { startDate: '2020-08-02T00:00:00' };

    countAuxiliaryEventsBetweenDates.returns(0);
    findContract.returns(SinonMongoose.stubChainedQueries(
      [[contract, { startDate: '2018-06-02T00:00:00', endDate: '2018-10-02T23:59:59' }]],
      ['sort', 'lean']
    ));

    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 0, '1234567890');

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(
      countAuxiliaryEventsBetweenDates,
      {
        auxiliary: contract.user,
        endDate: versionToUpdate.startDate,
        company: '1234567890',
        startDate: '2018-10-02T23:59:59',
      }
    );
    SinonMongoose.calledWithExactly(findContract, [
      { query: 'find', args: [{ company: '1234567890', user: contract.user }] },
      { query: 'sort', args: [{ startDate: -1 }] },
      { query: 'lean' },
    ]);
  });

  it('should return false if first version and existing events', async () => {
    const contract = { _id: new ObjectID(), user: new ObjectID(), versions: [{ _id: new ObjectID() }] };
    const versionToUpdate = { startDate: '2020-08-02T00:00:00' };

    countAuxiliaryEventsBetweenDates.returns(5);
    findContract.returns(SinonMongoose.stubChainedQueries([[contract]], ['sort', 'lean']));

    const result = await ContractHelper.canUpdateVersion(contract, versionToUpdate, 0, '1234567890');

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(
      countAuxiliaryEventsBetweenDates,
      { auxiliary: contract.user, endDate: versionToUpdate.startDate, company: '1234567890' }
    );
    SinonMongoose.calledWithExactly(findContract, [
      { query: 'find', args: [{ company: '1234567890', user: contract.user }] },
      { query: 'sort', args: [{ startDate: -1 }] },
      { query: 'lean' },
    ]);
  });
});

describe('formatVersionEditionPayload', () => {
  let generateSignatureRequest;
  beforeEach(() => {
    generateSignatureRequest = sinon.stub(ESignHelper, 'generateSignatureRequest');
  });
  afterEach(() => {
    generateSignatureRequest.restore();
  });

  it('should update signatue payload', async () => {
    const oldVersion = { grossHourlyRate: 12, startDate: '2019-09-12T00:00:00' };
    const newVersion = { signature: { template: '12345' } };
    const versionIndex = 1;
    generateSignatureRequest.returns({ data: { document_hash: '567890' } });

    const result = await ContractHelper.formatVersionEditionPayload(oldVersion, newVersion, versionIndex);

    expect(result.$set['versions.1.signature.eversignId']).toEqual('567890');
    expect(result.$unset['versions.1.signature.signedBy']).toEqual('');
  });

  it('should throw error if signature request returns error', async () => {
    try {
      const oldVersion = { grossHourlyRate: 12, startDate: '2019-09-12T00:00:00' };
      const newVersion = { signature: { template: '12345' } };
      const versionIndex = 1;
      generateSignatureRequest.returns({ data: { error: '567890' } });

      await ContractHelper.formatVersionEditionPayload(oldVersion, newVersion, versionIndex);
    } catch (e) {
      expect(e.output.statusCode).toEqual(400);
    }
  });

  it('should not update signatue payload', async () => {
    const oldVersion = { grossHourlyRate: 12, startDate: '2019-09-12T00:00:00' };
    const newVersion = { grossHourlyRate: 15 };
    const versionIndex = 1;

    const result = await ContractHelper.formatVersionEditionPayload(oldVersion, newVersion, versionIndex);

    expect(result.$set['versions.1.grossHourlyRate']).toEqual(15);
    expect(result.$unset['versions.1.signature']).toEqual('');
  });

  it('should update auxiliaryDoc', async () => {
    const oldVersion = { startDate: '2019-09-12T00:00:00', auxiliaryDoc: '1234567890' };
    const newVersion = { grossHourlyRate: 15 };
    const versionIndex = 1;

    const result = await ContractHelper.formatVersionEditionPayload(oldVersion, newVersion, versionIndex);

    expect(result.$unset['versions.1.auxiliaryDoc']).toEqual('');
    expect(result.$push['versions.1.auxiliaryArchives']).toEqual('1234567890');
  });

  it('should update previous version end date', async () => {
    const oldVersion = { startDate: moment('2019-09-12').toDate() };
    const newVersion = { startDate: moment('2019-09-16').toDate() };
    const versionIndex = 1;

    const result = await ContractHelper.formatVersionEditionPayload(oldVersion, newVersion, versionIndex);

    expect(result.$set['versions.0.endDate'])
      .toEqual(moment(newVersion.startDate).subtract(1, 'd').endOf('d').toISOString());
  });

  it('should update contract start date', async () => {
    const oldVersion = { startDate: '2019-09-12T00:00:00', auxiliaryDoc: '1234567890' };
    const newVersion = { startDate: '2019-09-16T00:00:00' };
    const versionIndex = 0;

    const result = await ContractHelper.formatVersionEditionPayload(oldVersion, newVersion, versionIndex);

    expect(result.$set.startDate).toEqual('2019-09-16T00:00:00');
  });
});

describe('updateVersion', () => {
  const contractId = new ObjectID();
  const versionId = new ObjectID();
  const credentials = { company: { _id: new ObjectID() } };
  const companyId = credentials.company._id;
  let findOneContract;
  let findOneAndUpdateContract;
  let updateOneContract;
  let canUpdateVersion;
  let formatVersionEditionPayload;
  let updateHistoryOnContractUpdateStub;
  beforeEach(() => {
    findOneContract = sinon.stub(Contract, 'findOne');
    findOneAndUpdateContract = sinon.stub(Contract, 'findOneAndUpdate');
    updateOneContract = sinon.stub(Contract, 'updateOne');
    canUpdateVersion = sinon.stub(ContractHelper, 'canUpdateVersion');
    formatVersionEditionPayload = sinon.stub(ContractHelper, 'formatVersionEditionPayload');
    updateHistoryOnContractUpdateStub = sinon.stub(SectorHistoryHelper, 'updateHistoryOnContractUpdate');
  });
  afterEach(() => {
    findOneContract.restore();
    findOneAndUpdateContract.restore();
    updateOneContract.restore();
    formatVersionEditionPayload.restore();
    canUpdateVersion.restore();
    updateHistoryOnContractUpdateStub.restore();
  });

  it('should update version', async () => {
    const versionToUpdate = {
      _id: versionId,
      startDate: '2019-09-10T00:00:00',
      signature: { templateId: '1234567890' },
    };
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [{ _id: versionId, startDate: '2019-09-10T00:00:00', auxiliaryDoc: 'toto' }],
    };
    canUpdateVersion.returns(true);
    formatVersionEditionPayload.returns({ $set: {}, $push: {} });

    findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
    findOneAndUpdateContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));

    updateHistoryOnContractUpdateStub.returns();

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate, credentials);

    sinon.assert.calledWithExactly(canUpdateVersion, contract, versionToUpdate, 0, companyId);
    sinon.assert.calledWithExactly(
      formatVersionEditionPayload,
      { _id: versionId, startDate: '2019-09-10T00:00:00', auxiliaryDoc: 'toto' },
      versionToUpdate,
      0
    );
    sinon.assert.calledWithExactly(
      updateHistoryOnContractUpdateStub,
      contractId.toHexString(),
      versionToUpdate,
      companyId
    );
    sinon.assert.notCalled(updateOneContract);
    SinonMongoose.calledWithExactly(findOneContract, [
      { query: 'findOne', args: [{ _id: contractId.toHexString() }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneAndUpdateContract, [
      { query: 'findOneAndUpdate', args: [{ _id: contractId.toHexString() }, { $set: {}, $push: {} }] },
      { query: 'lean' },
    ]);
  });

  it('should update version and unset', async () => {
    const versionToUpdate = {
      _id: versionId,
      startDate: '2019-09-10T00:00:00',
      signature: { templateId: '1234567890' },
    };
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [
        { _id: new ObjectID(), startDate: '2019-07-10T00:00:00', auxiliaryDoc: 'Tutu' },
        { _id: versionId, startDate: '2019-09-10T00:00:00', auxiliaryDoc: 'toto' },
      ],
    };
    canUpdateVersion.returns(true);
    formatVersionEditionPayload.returns({ $set: {}, $push: {}, $unset: { auxiliaryDoc: '' } });

    findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
    findOneAndUpdateContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate, credentials);

    sinon.assert.calledWithExactly(canUpdateVersion, contract, versionToUpdate, 1, companyId);
    sinon.assert.calledWithExactly(
      formatVersionEditionPayload,
      { _id: versionId, startDate: '2019-09-10T00:00:00', auxiliaryDoc: 'toto' },
      versionToUpdate,
      1
    );
    sinon.assert.notCalled(updateHistoryOnContractUpdateStub);
    sinon.assert.calledOnceWithExactly(
      updateOneContract,
      { _id: contractId.toHexString() }, { $unset: { auxiliaryDoc: '' } }
    );
    SinonMongoose.calledWithExactly(findOneContract, [
      { query: 'findOne', args: [{ _id: contractId.toHexString() }] },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(findOneAndUpdateContract, [
      { query: 'findOneAndUpdate', args: [{ _id: contractId.toHexString() }, { $set: {}, $push: {} }] },
      { query: 'lean' },
    ]);
  });

  it('should update first version and contract', async () => {
    try {
      const versionToUpdate = { _id: versionId, startDate: '2019-09-10T00:00:00' };
      const contract = {
        startDate: '2019-09-09T00:00:00',
        versions: [{ _id: versionId, startDate: '2019-09-10T00:00:00' }],
      };

      findOneContract.returns(SinonMongoose.stubChainedQueries([contract], ['lean']));
      canUpdateVersion.returns(false);
      updateHistoryOnContractUpdateStub.returns();

      await ContractHelper.updateVersion(
        contractId.toHexString(),
        versionId.toHexString(),
        versionToUpdate,
        companyId
      );
      sinon.assert.calledWithExactly(
        updateHistoryOnContractUpdateStub,
        contractId.toHexString(),
        versionToUpdate,
        companyId
      );
    } catch (e) {
      expect(e.output.statusCode).toEqual(422);
    } finally {
      sinon.assert.notCalled(formatVersionEditionPayload);
      sinon.assert.notCalled(updateOneContract);
      sinon.assert.notCalled(findOneAndUpdateContract);
      SinonMongoose.calledWithExactly(findOneContract, [
        { query: 'findOne', args: [{ _id: contractId.toHexString() }] },
        { query: 'lean' },
      ]);
    }
  });
});

describe('deleteVersion', () => {
  let findOneContract;
  let saveContract;
  let deleteOne;
  let updateOneCustomer;
  let updateOneUser;
  let deleteFile;
  let countAuxiliaryEventsBetweenDates;
  let updateHistoryOnContractDeletionStub;
  const versionId = new ObjectID();
  const contractId = new ObjectID();
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    findOneContract = sinon.stub(Contract, 'findOne');
    saveContract = sinon.stub(Contract.prototype, 'save');
    deleteOne = sinon.stub(Contract, 'deleteOne');
    updateOneCustomer = sinon.stub(Customer, 'updateOne');
    updateOneUser = sinon.stub(User, 'updateOne');
    deleteFile = sinon.stub(GDriveStorageHelper, 'deleteFile');
    countAuxiliaryEventsBetweenDates = sinon.stub(EventRepository, 'countAuxiliaryEventsBetweenDates');
    updateHistoryOnContractDeletionStub = sinon.stub(SectorHistoryHelper, 'updateHistoryOnContractDeletion');
  });
  afterEach(() => {
    findOneContract.restore();
    saveContract.restore();
    deleteOne.restore();
    updateOneCustomer.restore();
    updateOneUser.restore();
    deleteFile.restore();
    countAuxiliaryEventsBetweenDates.restore();
    updateHistoryOnContractDeletionStub.restore();
  });

  it('should delete contract', async () => {
    const contract = {
      _id: contractId,
      startDate: '2019-09-09',
      user: 'toot',
      versions: [{ _id: versionId, auxiliaryDoc: { driveId: '123456789' } }],
    };
    countAuxiliaryEventsBetweenDates.returns(0);
    findOneContract.returns(contract);
    updateHistoryOnContractDeletionStub.returns();
    await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString(), credentials);
    sinon.assert.calledWithExactly(findOneContract, { _id: contractId.toHexString(), 'versions.0': { $exists: true } });
    sinon.assert.calledWithExactly(countAuxiliaryEventsBetweenDates, {
      auxiliary: 'toot',
      startDate: '2019-09-09',
      company: credentials.company._id,
    });
    sinon.assert.notCalled(saveContract);
    sinon.assert.calledWithExactly(deleteOne, { _id: contractId.toHexString() });
    sinon.assert.calledWithExactly(updateOneUser, { _id: 'toot' }, { $pull: { contracts: contractId } });
    sinon.assert.notCalled(updateOneCustomer);
    sinon.assert.calledWithExactly(deleteFile, '123456789');
    sinon.assert.calledWithExactly(updateHistoryOnContractDeletionStub, contract, credentials.company._id);
  });

  it('should throw forbidden error as deletion is not allowed', async () => {
    try {
      const contract = {
        _id: contractId,
        user: 'toot',
        versions: [{ _id: versionId, auxiliaryDoc: { driveId: '123456789' } }],
      };
      countAuxiliaryEventsBetweenDates.returns(1);
      findOneContract.returns(contract);

      await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString(), credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(403);
    } finally {
      sinon.assert.calledWithExactly(findOneContract, {
        _id: contractId.toHexString(),
        'versions.0': { $exists: true },
      });
      sinon.assert.notCalled(saveContract);
      sinon.assert.called(countAuxiliaryEventsBetweenDates);
      sinon.assert.notCalled(deleteOne);
      sinon.assert.notCalled(updateOneUser);
      sinon.assert.notCalled(updateOneCustomer);
      sinon.assert.notCalled(deleteFile);
      sinon.assert.notCalled(updateHistoryOnContractDeletionStub);
    }
  });

  it('should delete version and update previous version', async () => {
    const contract = new Contract({
      _id: contractId,
      user: 'toot',
      versions: [{ _id: new ObjectID() }, { _id: versionId, auxiliaryDoc: { driveId: '123456789' } }],
    });
    findOneContract.returns(contract);

    await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString(), credentials);
    sinon.assert.calledWithExactly(findOneContract, { _id: contractId.toHexString(), 'versions.0': { $exists: true } });
    sinon.assert.called(saveContract);
    sinon.assert.notCalled(deleteOne);
    sinon.assert.notCalled(updateOneUser);
    sinon.assert.notCalled(updateOneCustomer);
    sinon.assert.calledWithExactly(deleteFile, '123456789');
    sinon.assert.notCalled(updateHistoryOnContractDeletionStub);
  });
});

describe('getContractInfo', () => {
  let getDaysRatioBetweenTwoDates;
  beforeEach(() => {
    getDaysRatioBetweenTwoDates = sinon.stub(UtilsHelper, 'getDaysRatioBetweenTwoDates');
  });
  afterEach(() => {
    getDaysRatioBetweenTwoDates.restore();
  });

  it('Case 1. One version no sunday', () => {
    const versions = [{ endDate: '', startDate: '2019-05-04', weeklyHours: 20 }];
    const query = { startDate: '2019-06-03', endDate: '2019-06-07' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 0, holidays: 0 });

    const result = ContractHelper.getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 });

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(8);
    expect(result.workedDaysRatio).toBe(0.4);
    expect(result.holidaysHours).toBe(0);
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-06-03').toDate(),
      moment('2019-06-07').toDate()
    );
  });

  it('Case 2. One version and sunday included', () => {
    const versions = [{ endDate: '', startDate: '2019-05-04', weeklyHours: 24 }];
    const query = { startDate: '2019-06-03', endDate: '2019-06-09' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 1, holidays: 0 });

    const result = ContractHelper.getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 });

    expect(result).toBeDefined();
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-06-03').startOf('d').toDate(),
      moment('2019-06-09').toDate()
    );
  });

  it('Case 3. Multiple versions', () => {
    const versions = [
      { startDate: '2019-01-01', endDate: '2019-07-04', weeklyHours: 18 },
      { endDate: '', startDate: '2019-07-04', weeklyHours: 24 },
    ];
    const query = { startDate: '2019-06-27', endDate: '2019-07-05' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 1, holidays: 0 });

    const result = ContractHelper.getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 });

    expect(result).toBeDefined();
    sinon.assert.calledTwice(getDaysRatioBetweenTwoDates);
  });

  it('Case 4. One version and holiday included', () => {
    const versions = [{ endDate: '', startDate: '2019-05-04', weeklyHours: 24 }];
    const query = { startDate: '2019-05-04', endDate: '2019-05-10' };
    getDaysRatioBetweenTwoDates.returns({ businessDays: 4, sundays: 0, holidays: 1 });

    const result = ContractHelper.getContractInfo(versions, query, { businessDays: 10, sundays: 0, holidays: 0 });

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(12);
    expect(result.workedDaysRatio).toBe(0.5);
    expect(result.holidaysHours).toBe(4);
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-05-04')
        .startOf('d')
        .toDate(),
      moment('2019-05-10').toDate()
    );
  });
});

describe('uploadFile', () => {
  let createAndSaveFileStub;
  beforeEach(() => {
    createAndSaveFileStub = sinon.stub(ContractHelper, 'createAndSaveFile');
  });
  afterEach(() => {
    createAndSaveFileStub.restore();
  });

  it('should upload a file', async () => {
    const params = { driveId: 'fakeDriveId', _id: new ObjectID() };
    const payload = {
      file: 'test',
      type: 'signedContract',
      fileName: 'test',
      versionId: '12345',
    };
    createAndSaveFileStub.returns({ name: 'test' });
    const version = {
      contractId: params._id,
      _id: payload.versionId,
    };
    const fileInfo = {
      auxiliaryDriveId: params.driveId,
      name: payload.fileName,
      type: payload['Content-Type'],
      body: payload.file,
    };
    const result = await ContractHelper.uploadFile(params, payload);
    expect(result).toBeDefined();
    expect(result).toEqual({ name: 'test' });
    sinon.assert.calledWithExactly(createAndSaveFileStub, version, fileInfo);
  });
});

describe('auxiliaryHasActiveContractOnDay', () => {
  it('should return false as no contract', () => {
    const contracts = [];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return false as no contract on day (startDate after day)', () => {
    const contracts = [{ startDate: '2019-03-11T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return false as no contract on day (end date before day)', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18', endDate: '2019-01-10T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return true as contract on day (end date after day)', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18', endDate: '2019-01-31T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeTruthy();
  });

  it('should return true as contract on day (no endDate)', () => {
    const contracts = [{ startDate: '2019-01-01T08:38:18' }];
    const date = '2019-01-11T08:38:18';
    const result = ContractHelper.auxiliaryHasActiveContractOnDay(contracts, date);

    expect(result).toBeTruthy();
  });
});
