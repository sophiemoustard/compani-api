const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const flat = require('flat');
const Boom = require('boom');
const cloneDeep = require('lodash/cloneDeep');
const { ObjectID } = require('mongodb');
const EventHelper = require('../../../src/helpers/events');
const ContractHelper = require('../../../src/helpers/contracts');
const UtilsHelper = require('../../../src/helpers/utils');
const ESignHelper = require('../../../src/helpers/eSign');
const CustomerHelper = require('../../../src/helpers/customers');
const GDriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const { RESIGNATION } = require('../../../src/helpers/constants');
const Contract = require('../../../src/models/Contract');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const EventRepository = require('../../../src/repositories/EventRepository');
const ContractRepository = require('../../../src/repositories/ContractRepository');
require('sinon-mongoose');

describe('getContractList', () => {
  const contracts = [{ _id: new ObjectID() }];
  let ContractMock;
  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
  });
  afterEach(() => {
    ContractMock.restore();
  });

  it('should return contract list', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const query = { user: '1234567890' };
    ContractMock.expects('find')
      .withExactArgs({ $and: [{ user: '1234567890' }] })
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .returns(contracts);

    const result = await ContractHelper.getContractList(query, credentials);
    expect(result).toEqual(contracts);
    ContractMock.verify();
  });

  it('should format query with dates', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const query = { startDate: '2019-09-09T00:00:00', endDate: '2019-09-09T00:00:00' };
    ContractMock.expects('find')
      .withExactArgs({
        $and: [{
          $or: [
            { versions: { $elemMatch: { startDate: { $gte: '2019-09-09T00:00:00', $lte: '2019-09-09T00:00:00' } } } },
            { endDate: { $gte: '2019-09-09T00:00:00', $lte: '2019-09-09T00:00:00' } },
          ],
        }],
      })
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .returns(contracts);

    const result = await ContractHelper.getContractList(query, credentials);
    expect(result).toEqual(contracts);
    ContractMock.verify();
  });
});

describe('createContract', () => {
  let getUserEndedCompanyContractsStub;
  let ContractMock;
  let generateSignatureRequestStub;
  let UserMock;
  let CustomerMock;

  const newCompanyContractPayload = {
    _id: new ObjectID(),
    endDate: null,
    user: new ObjectID(),
    startDate: moment('2018-12-03T23:00:00').toDate(),
    status: 'contract_with_company',
    versions: [{
      weeklyHours: 18,
      grossHourlyRate: 25,
    }],
  };

  const newCompanyContractWithSignaturePayload = {
    _id: new ObjectID(),
    endDate: null,
    user: new ObjectID(),
    startDate: moment('2018-12-03T23:00:00').toDate(),
    status: 'contract_with_company',
    versions: [{
      weeklyHours: 18,
      grossHourlyRate: 25,
      signature: { templateId: '0987654321', title: 'Test' },
    }],
  };

  const newCompanyContractWithSignatureDoc = {
    ...newCompanyContractWithSignaturePayload,
    versions: [{ ...newCompanyContractWithSignaturePayload.versions[0], signature: { eversignId: '1234567890' } }],
  };

  beforeEach(() => {
    getUserEndedCompanyContractsStub = sinon.stub(ContractRepository, 'getUserEndedCompanyContracts');
    generateSignatureRequestStub = sinon.stub(ESignHelper, 'generateSignatureRequest');
    ContractMock = sinon.mock(Contract);
    UserMock = sinon.mock(User);
    CustomerMock = sinon.mock(Customer);
  });

  afterEach(() => {
    getUserEndedCompanyContractsStub.restore();
    generateSignatureRequestStub.restore();
    ContractMock.restore();
    UserMock.restore();
    CustomerMock.restore();
  });

  it('should create a new company contract', async () => {
    getUserEndedCompanyContractsStub.returns([]);
    ContractMock
      .expects('create')
      .withArgs(newCompanyContractPayload)
      .returns(newCompanyContractPayload);
    UserMock
      .expects('findOneAndUpdate')
      .withArgs({ _id: newCompanyContractPayload.user }, { $push: { contracts: newCompanyContractPayload._id }, $unset: { inactivityDate: '' } })
      .once();
    CustomerMock.expects('findOneAndUpdate').never();

    const result = await ContractHelper.createContract(newCompanyContractPayload);

    sinon.assert.notCalled(generateSignatureRequestStub);
    ContractMock.verify();
    UserMock.verify();
    CustomerMock.verify();
    expect(result).toEqual(expect.objectContaining(newCompanyContractPayload));
  });

  it('should create a new company contract and generate a signature request', async () => {
    getUserEndedCompanyContractsStub.returns([]);
    generateSignatureRequestStub.returns({ data: { document_hash: '1234567890' } });
    ContractMock
      .expects('create')
      .withArgs(newCompanyContractWithSignatureDoc)
      .returns(newCompanyContractWithSignatureDoc);
    UserMock
      .expects('findOneAndUpdate')
      .withArgs({ _id: newCompanyContractWithSignaturePayload.user }, { $push: { contracts: newCompanyContractWithSignaturePayload._id }, $unset: { inactivityDate: '' } })
      .once();
    CustomerMock.expects('findOneAndUpdate').never();

    const result = await ContractHelper.createContract(newCompanyContractWithSignaturePayload);

    sinon.assert.calledWith(generateSignatureRequestStub, newCompanyContractWithSignaturePayload.versions[0].signature);
    ContractMock.verify();
    UserMock.verify();
    CustomerMock.verify();
    expect(result).toEqual(expect.objectContaining(newCompanyContractWithSignatureDoc));
  });

  it('should create a new customer contract', async () => {
    const newCustomerContractPayload = { ...newCompanyContractPayload, customer: new ObjectID() };

    getUserEndedCompanyContractsStub.returns([]);
    ContractMock
      .expects('create')
      .withArgs(newCustomerContractPayload)
      .returns(newCustomerContractPayload);
    UserMock
      .expects('findOneAndUpdate')
      .withArgs({ _id: newCustomerContractPayload.user }, { $push: { contracts: newCustomerContractPayload._id }, $unset: { inactivityDate: '' } })
      .once();
    CustomerMock
      .expects('findOneAndUpdate')
      .withArgs({ _id: newCustomerContractPayload.customer }, { $push: { contracts: newCustomerContractPayload._id } })
      .once();

    const result = await ContractHelper.createContract(newCustomerContractPayload);

    sinon.assert.notCalled(generateSignatureRequestStub);
    ContractMock.verify();
    UserMock.verify();
    CustomerMock.verify();
    expect(result).toEqual(expect.objectContaining(newCustomerContractPayload));
  });

  it('should throw a 400 error if new company contract startDate is before last ended company contract', async () => {
    try {
      getUserEndedCompanyContractsStub.returns([{ startDate: moment('2018-12-04T23:00:00').toDate() }]);
      await ContractHelper.createContract(newCompanyContractPayload);
    } catch (e) {
      expect(e).toEqual(Boom.badRequest('New company contract start date is before last company contract end date.'));
    }
  });
});

describe('endContract', () => {
  let ContractFindOneStub;
  let ContractFindStub;
  let UserfindOneAndUpdateStub;
  let contractSaveStub;
  let unassignInterventionsOnContractEnd;
  let removeEventsExceptInterventionsOnContractEnd;
  let updateAbsencesOnContractEnd;
  let contractDoc;
  let unassignReferentOnContractEnd;
  const payload = {
    endDate: moment('2018-12-03T23:00:00').toDate(),
    endNotificationDate: moment('2018-12-03T23:00:00').toDate(),
    endReason: RESIGNATION,
    otherMisc: 'test',
  };
  const newContract = {
    _id: new ObjectID(),
    endDate: null,
    user: new ObjectID(),
    startDate: moment('2018-12-03T23:00:00').toDate(),
    status: 'contract_with_company',
    versions: [{ _id: new ObjectID() }],
  };
  const userContracts = [{
    user: new ObjectID(),
    endDate: moment('2019-08-06T23:00:00').toDate(),
    startDate: moment('2019-05-06T23:00:00').toDate(),
    status: 'contract_with_customer',
  }];
  const updatedContract = {
    ...newContract[0],
    ...payload,
    versions: [{ ...newContract.versions[0], endDate: payload.endDate }],
  };
  const credentials = { _id: new ObjectID() };
  beforeEach(() => {
    contractDoc = new Contract(cloneDeep(newContract));
    contractSaveStub = sinon.stub(contractDoc, 'save');
    ContractFindOneStub = sinon.stub(Contract, 'findOne');
    ContractFindStub = sinon.stub(Contract, 'find');
    UserfindOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate');
    unassignInterventionsOnContractEnd = sinon.stub(EventHelper, 'unassignInterventionsOnContractEnd');
    removeEventsExceptInterventionsOnContractEnd = sinon.stub(EventHelper, 'removeEventsExceptInterventionsOnContractEnd');
    updateAbsencesOnContractEnd = sinon.stub(EventHelper, 'updateAbsencesOnContractEnd');
    unassignReferentOnContractEnd = sinon.stub(CustomerHelper, 'unassignReferentOnContractEnd');
  });
  afterEach(() => {
    ContractFindOneStub.restore();
    ContractFindStub.restore();
    contractSaveStub.restore();
    UserfindOneAndUpdateStub.restore();
    unassignInterventionsOnContractEnd.restore();
    removeEventsExceptInterventionsOnContractEnd.restore();
    updateAbsencesOnContractEnd.restore();
    unassignReferentOnContractEnd.restore();
  });

  it('should end contract', async () => {
    ContractFindOneStub.returns(contractDoc);
    ContractFindStub.returns([updatedContract]);

    const result = await ContractHelper.endContract(contractDoc._id, payload, credentials);

    sinon.assert.called(ContractFindOneStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: contractDoc.user });
    sinon.assert.calledWith(unassignInterventionsOnContractEnd);
    sinon.assert.called(removeEventsExceptInterventionsOnContractEnd);
    sinon.assert.called(updateAbsencesOnContractEnd);
    sinon.assert.called(unassignReferentOnContractEnd);
    expect(result.toObject()).toMatchObject(updatedContract);
  });

  it('should end contract and set inactivity date for user if all contracts are ended', async () => {
    ContractFindOneStub.returns(contractDoc);
    ContractFindStub.returns(userContracts);

    const result = await ContractHelper.endContract(contractDoc._id, payload, credentials);

    sinon.assert.called(ContractFindOneStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: contractDoc.user });
    sinon.assert.calledWith(
      UserfindOneAndUpdateStub,
      { _id: contractDoc.user },
      { $set: { inactivityDate: moment(payload.endDate).add('1', 'month').startOf('M').toDate() } }
    );
    expect(result.toObject()).toMatchObject(updatedContract);
  });

  it('should throw a 403 error if contract is already ended', async () => {
    const contract = {
      _id: new ObjectID(),
      endDate: moment('2018-12-30T23:00:00').toDate(),
      user: new ObjectID(),
      startDate: moment('2018-12-03T23:00:00').toDate(),
      status: 'contract_with_company',
      versions: [{ _id: new ObjectID() }],
    };
    ContractFindOneStub.returns(contract);

    try {
      const result = await ContractHelper.endContract(contract._id, payload, credentials);
      expect(result).toBe(undefined);
    } catch (e) {
      expect(e).toEqual(Boom.forbidden('Contract is already ended.'));
    }
  });
});

describe('createVersion', () => {
  let generateSignatureRequest;
  let ContractMock;
  let updatePreviousVersion;
  beforeEach(() => {
    generateSignatureRequest = sinon.stub(ESignHelper, 'generateSignatureRequest');
    ContractMock = sinon.mock(Contract);
    updatePreviousVersion = sinon.stub(ContractHelper, 'updatePreviousVersion');
  });
  afterEach(() => {
    generateSignatureRequest.restore();
    ContractMock.restore();
    updatePreviousVersion.restore();
  });

  it('should create version and update previous one', async () => {
    const newVersion = { startDate: new Date('2019-09-13T00:00:00') };
    const contract = {
      _id: new ObjectID(),
      startDate: '2019-09-09T00:00:00',
      versions: [{ startDate: '2019-09-01T00:00:00' }, { startDate: '2019-09-10T00:00:00' }],
    };
    const contractDoc = new Contract(cloneDeep(contract));

    ContractMock.expects('findById')
      .withExactArgs(
        contract._id.toHexString(),
        {},
        { autopopulate: false }
      )
      .once()
      .returns(contractDoc);

    const contractDocSaveStub = sinon.stub(contractDoc, 'save');

    await ContractHelper.createVersion(contract._id.toHexString(), newVersion);

    ContractMock.verify();
    sinon.assert.notCalled(generateSignatureRequest);
    expect(contractDoc.versions[2]).toEqual(expect.objectContaining({ ...newVersion }));
    sinon.assert.calledOnce(contractDocSaveStub);
    sinon.assert.calledWith(updatePreviousVersion, contract._id.toHexString(), 1, newVersion.startDate);
  });

  it('should generate signature request', async () => {
    const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
    const contract = {
      _id: new ObjectID(),
      startDate: '2019-09-09T00:00:00',
    };
    generateSignatureRequest.returns({ data: { document_hash: '1234567890' } });

    const contractDoc = new Contract(cloneDeep(contract));

    ContractMock.expects('findById')
      .withExactArgs(
        contract._id.toHexString(),
        {},
        { autopopulate: false }
      )
      .once()
      .returns(contractDoc);

    const contractDocSaveStub = sinon.stub(contractDoc, 'save');

    await ContractHelper.createVersion(contract._id.toHexString(), newVersion);

    ContractMock.verify();
    sinon.assert.notCalled(updatePreviousVersion);
    sinon.assert.calledOnce(contractDocSaveStub);
    sinon.assert.calledWith(generateSignatureRequest, { templateId: '1234567890' });
  });

  it('should throw on signature generation error', async () => {
    try {
      const contract = {
        _id: new ObjectID(),
        startDate: '2019-09-09T00:00:00',
      };
      const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };

      const contractDoc = new Contract(cloneDeep(contract));

      ContractMock.expects('findById')
        .withExactArgs(
          contract._id.toHexString(),
          {},
          { autopopulate: false }
        )
        .once()
        .returns(contractDoc);

      generateSignatureRequest.returns({ data: { error: { type: '1234567890' } } });

      await ContractHelper.createVersion(contract._id.toHexString(), newVersion);
    } catch (e) {
      expect(e.output.statusCode).toEqual(400);
      ContractMock.verify();
      sinon.assert.notCalled(updatePreviousVersion);
      sinon.assert.calledWith(generateSignatureRequest, { templateId: '1234567890' });
    }
  });
});

describe('updateVersion', () => {
  let ContractMock;
  let updateOneContract;
  let updatePreviousVersion;
  let generateSignatureRequest;
  let canUpdate;
  const contractId = new ObjectID();
  const versionId = new ObjectID();
  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    updateOneContract = sinon.stub(Contract, 'updateOne');
    updatePreviousVersion = sinon.stub(ContractHelper, 'updatePreviousVersion');
    canUpdate = sinon.stub(ContractHelper, 'canUpdate');
    generateSignatureRequest = sinon.stub(ESignHelper, 'generateSignatureRequest');
  });
  afterEach(() => {
    ContractMock.restore();
    updateOneContract.restore();
    updatePreviousVersion.restore();
    generateSignatureRequest.restore();
    canUpdate.restore();
  });

  it('should generate signature and update version', async () => {
    const versionToUpdate = { _id: versionId, startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [{ _id: versionId, startDate: '2019-09-10T00:00:00', auxiliaryDoc: 'toto' }],
    };
    generateSignatureRequest.returns({ data: { document_hash: '1234567890' } });
    canUpdate.returns(true);
    ContractMock.expects('findOne').chain('lean').once().returns(contract);
    ContractMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: contractId.toHexString() },
        {
          $set: flat({ 'versions.0': { ...versionToUpdate, signature: { eversignId: '1234567890' } } }),
          $push: { 'versions.0.auxiliaryArchives': 'toto' },
          $unset: flat({ 'versions.0': { auxiliaryDoc: '', signature: { signedBy: '' } } }),
        }
      )
      .chain('lean')
      .once()
      .returns(contract);

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate);

    ContractMock.verify();
    sinon.assert.called(generateSignatureRequest);
    sinon.assert.calledWith(updateOneContract, { _id: contractId.toHexString() }, { startDate: '2019-09-10T00:00:00' });
    sinon.assert.notCalled(updatePreviousVersion);
  });

  it('should update first version and contract', async () => {
    const versionToUpdate = { _id: versionId, startDate: '2019-09-10T00:00:00' };
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [{ _id: versionId, startDate: '2019-09-10T00:00:00' }],
    };
    ContractMock.expects('findOne').chain('lean').once().returns(contract);
    ContractMock.expects('findOneAndUpdate').chain('lean').once().returns(contract);
    canUpdate.returns(true);

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate);

    ContractMock.verify();
    sinon.assert.notCalled(generateSignatureRequest);
    canUpdate.returns(true);
    sinon.assert.calledWith(updateOneContract, { _id: contractId.toHexString() }, { startDate: '2019-09-10T00:00:00' });
    sinon.assert.notCalled(updatePreviousVersion);
  });

  it('should update current and previous version', async () => {
    const versionToUpdate = { _id: versionId, startDate: '2019-09-10T00:00:00' };
    const previousVersionId = new ObjectID();
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [
        { _id: previousVersionId, startDate: '2019-08-01T00:00:00', endDate: '2019-09-05T00:00:00' },
        { _id: versionId, startDate: '2019-09-10T00:00:00' },
      ],
    };
    ContractMock.expects('findOne').chain('lean').once().returns(contract);
    ContractMock.expects('findOneAndUpdate').chain('lean').once().returns(contract);
    canUpdate.returns(true);

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate);

    ContractMock.verify();
    canUpdate.returns(true);
    sinon.assert.notCalled(generateSignatureRequest);
    sinon.assert.calledWith(updatePreviousVersion, contract, 0, '2019-09-10T00:00:00');
    sinon.assert.notCalled(updateOneContract);
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
  const versionId = new ObjectID();
  const contractId = new ObjectID();
  beforeEach(() => {
    findOneContract = sinon.stub(Contract, 'findOne');
    saveContract = sinon.stub(Contract.prototype, 'save');
    deleteOne = sinon.stub(Contract, 'deleteOne');
    updateOneCustomer = sinon.stub(Customer, 'updateOne');
    updateOneUser = sinon.stub(User, 'updateOne');
    deleteFile = sinon.stub(GDriveStorageHelper, 'deleteFile');
    countAuxiliaryEventsBetweenDates = sinon.stub(EventRepository, 'countAuxiliaryEventsBetweenDates');
  });
  afterEach(() => {
    findOneContract.restore();
    saveContract.restore();
    deleteOne.restore();
    updateOneCustomer.restore();
    updateOneUser.restore();
    deleteFile.restore();
    countAuxiliaryEventsBetweenDates.restore();
  });

  it('should delete contract', async () => {
    const contract = {
      _id: contractId,
      startDate: '2019-09-09',
      status: 'ok',
      user: 'toot',
      versions: [{ _id: versionId, auxiliaryDoc: { driveId: '123456789' } }],
    };
    countAuxiliaryEventsBetweenDates.returns(0);
    findOneContract.returns(contract);

    await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString());
    sinon.assert.calledWith(findOneContract, { _id: contractId.toHexString(), 'versions.0': { $exists: true } });
    sinon.assert.calledWith(countAuxiliaryEventsBetweenDates, { auxiliary: 'toot', startDate: '2019-09-09', status: 'ok' });
    sinon.assert.notCalled(saveContract);
    sinon.assert.calledWith(deleteOne, { _id: contractId.toHexString() });
    sinon.assert.calledWith(updateOneUser, { _id: 'toot' }, { $pull: { contracts: contractId } });
    sinon.assert.notCalled(updateOneCustomer);
    sinon.assert.calledWith(deleteFile, '123456789');
  });

  it('should throw forbidden error as deletion is not allowed', async () => {
    try {
      const contract = {
        _id: contractId,
        user: 'toot',
        versions: [{ _id: versionId, auxiliaryDoc: { driveId: '123456789' } }],
      };
      countAuxiliaryEventsBetweenDates.returns(0);
      findOneContract.returns(contract);

      await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString());
    } catch (e) {
      expect(e.output.statusCode).toEqual(403);

      sinon.assert.calledWith(findOneContract, { _id: contractId.toHexString(), 'versions.0': { $exists: true } });
      sinon.assert.notCalled(saveContract);
      sinon.assert.called(countAuxiliaryEventsBetweenDates);
      sinon.assert.notCalled(deleteOne);
      sinon.assert.notCalled(updateOneUser);
      sinon.assert.notCalled(updateOneCustomer);
      sinon.assert.notCalled(deleteFile);
    }
  });

  it('should delete version and update previous version for company contract', async () => {
    const contract = new Contract({
      _id: contractId,
      user: 'toot',
      versions: [{ _id: new ObjectID() }, { _id: versionId, customerDoc: { driveId: '123456789' } }],
    });
    findOneContract.returns(contract);

    await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString());
    sinon.assert.calledWith(findOneContract, { _id: contractId.toHexString(), 'versions.0': { $exists: true } });
    sinon.assert.called(saveContract);
    sinon.assert.notCalled(deleteOne);
    sinon.assert.notCalled(updateOneUser);
    sinon.assert.notCalled(updateOneCustomer);
    sinon.assert.calledWith(deleteFile, '123456789');
  });

  it('should delete customer contract', async () => {
    const contract = {
      _id: contractId,
      user: 'toot',
      customer: 'qwer',
      versions: [{ _id: versionId, auxiliaryDoc: { driveId: '123456789' } }],
    };
    findOneContract.returns(contract);

    await ContractHelper.deleteVersion(contractId.toHexString(), versionId.toHexString());
    sinon.assert.calledWith(findOneContract, { _id: contractId.toHexString(), 'versions.0': { $exists: true } });
    sinon.assert.notCalled(saveContract);
    sinon.assert.calledWith(deleteOne, { _id: contractId.toHexString() });
    sinon.assert.calledWith(updateOneUser, { _id: 'toot' }, { $pull: { contracts: contractId } });
    sinon.assert.calledWith(updateOneCustomer, { _id: 'qwer' }, { $pull: { contracts: contractId } });
    sinon.assert.calledWith(deleteFile, '123456789');
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
    sinon.assert.calledWith(
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
    sinon.assert.calledWith(
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
    sinon.assert.calledWith(
      getDaysRatioBetweenTwoDates,
      moment('2019-05-04').startOf('d').toDate(),
      moment('2019-05-10').toDate()
    );
  });
});
