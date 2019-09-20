const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const flat = require('flat');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const EventHelper = require('../../../helpers/events');
const ContractHelper = require('../../../helpers/contracts');
const ESignHelper = require('../../../helpers/eSign');
const GDriveStorageHelper = require('../../../helpers/gdriveStorage');
const Contract = require('../../../models/Contract');
const User = require('../../../models/User');
const Customer = require('../../../models/Customer');
const EventRepository = require('../../../repositories/EventRepository');
require('sinon-mongoose');

describe('endContract', () => {
  let ContractFindOneStub;
  let ContractFindStub;
  let UserfindOneAndUpdateStub;
  let contractSaveStub;
  let unassignInterventionsOnContractEnd;
  let removeEventsExceptInterventionsOnContractEnd;
  let updateAbsencesOnContractEnd;
  const payload = {
    endDate: moment('2018-12-03T23:00:00').toDate(),
    endNotificationDate: moment('2018-12-03T23:00:00').toDate(),
    endReason: 'test',
    otherMisc: 'test',
  };
  let newContract = {
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
    newContract = new Contract(newContract);
    contractSaveStub = sinon.stub(newContract, 'save');
    ContractFindOneStub = sinon.stub(Contract, 'findOne');
    ContractFindStub = sinon.stub(Contract, 'find');
    UserfindOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate');
    unassignInterventionsOnContractEnd = sinon.stub(EventHelper, 'unassignInterventionsOnContractEnd');
    removeEventsExceptInterventionsOnContractEnd = sinon.stub(EventHelper, 'removeEventsExceptInterventionsOnContractEnd');
    updateAbsencesOnContractEnd = sinon.stub(EventHelper, 'updateAbsencesOnContractEnd');
  });
  afterEach(() => {
    ContractFindOneStub.restore();
    ContractFindStub.restore();
    contractSaveStub.restore();
    UserfindOneAndUpdateStub.restore();
    unassignInterventionsOnContractEnd.restore();
    removeEventsExceptInterventionsOnContractEnd.restore();
    updateAbsencesOnContractEnd.restore();
  });

  it('should end contract', async () => {
    ContractFindOneStub.returns(newContract);
    ContractFindStub.returns([updatedContract]);

    const result = await ContractHelper.endContract(newContract._id, payload, credentials);

    sinon.assert.called(ContractFindOneStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: newContract.user });
    sinon.assert.calledWith(unassignInterventionsOnContractEnd);
    sinon.assert.called(removeEventsExceptInterventionsOnContractEnd);
    sinon.assert.called(updateAbsencesOnContractEnd);
    expect(result.toObject()).toMatchObject(updatedContract);
  });

  it('should end contract and set inactivity date for user if all contracts are ended', async () => {
    ContractFindOneStub.returns(newContract);
    ContractFindStub.returns(userContracts);

    const result = await ContractHelper.endContract(newContract._id, payload, credentials);

    sinon.assert.called(ContractFindOneStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: newContract.user });
    sinon.assert.calledWith(
      UserfindOneAndUpdateStub,
      { _id: newContract.user },
      { $set: { inactivityDate: moment().add('1', 'months').startOf('M').toDate() } }
    );
    expect(result.toObject()).toMatchObject(updatedContract);
  });
});

describe('createVersion', () => {
  let generateSignatureRequest;
  let ContractMock;
  let updatePreviousVersion;
  const contractId = new ObjectID();
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
    const newVersion = { startDate: '2019-09-10T00:00:00' };
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [
        { _id: '1234567890', startDate: '2019-09-01T00:00:00' },
        { _id: 'qwertyuiop', startDate: '2019-09-10T00:00:00' },
      ],
    };
    ContractMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: contractId.toHexString() },
        { $push: { versions: newVersion } },
        { new: true, autopopulate: false }
      )
      .chain('lean')
      .once()
      .returns(contract);

    await ContractHelper.createVersion(contractId.toHexString(), newVersion);

    ContractMock.verify();
    sinon.assert.notCalled(generateSignatureRequest);
    sinon.assert.calledWith(updatePreviousVersion, contract, 0, '2019-09-10T00:00:00');
  });

  it('should generate signature request', async () => {
    const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [{ _id: '1234567890', startDate: '2019-09-10T00:00:00' }],
    };
    generateSignatureRequest.returns({ data: { document_hash: '1234567890' } });
    ContractMock
      .expects('findOneAndUpdate')
      .withExactArgs(
        { _id: contractId.toHexString() },
        { $push: { versions: { startDate: '2019-09-10T00:00:00', signature: { eversignId: '1234567890' } } } },
        { new: true, autopopulate: false }
      )
      .chain('lean')
      .once()
      .returns(contract);

    await ContractHelper.createVersion(contractId.toHexString(), newVersion);

    ContractMock.verify();
    sinon.assert.notCalled(updatePreviousVersion);
    sinon.assert.calledWith(generateSignatureRequest, { templateId: '1234567890' });
  });

  it('should throw on signature generation error', async () => {
    try {
      const newVersion = { startDate: '2019-09-10T00:00:00', signature: { templateId: '1234567890' } };
      ContractMock.expects('findOneAndUpdate').never();
      generateSignatureRequest.returns({ data: { error: { type: '1234567890' } } });

      await ContractHelper.createVersion(contractId.toHexString(), newVersion);
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
          $unset: flat({ 'versions.0': { auxiliaryDoc: '' } }),
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
