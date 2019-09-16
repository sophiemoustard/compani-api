const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const flat = require('flat');
const mongoose = require('mongoose');
const { ObjectID } = require('mongodb');
const EventHelper = require('../../../helpers/events');
const ContractHelper = require('../../../helpers/contracts');
const Contract = require('../../../models/Contract');
const User = require('../../../models/User');
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

describe('updateVersion', () => {
  let ContractMock;
  let updateOneMock;
  const contractId = new ObjectID();
  const versionId = new ObjectID();
  const versionToUpdate = { _id: versionId, startDate: '2019-09-10T00:00:00' };
  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    updateOneMock = sinon.stub(Contract, 'updateOne');
  });
  afterEach(() => {
    ContractMock.restore();
    updateOneMock.restore();
  });

  it('should update first version and contract', async () => {
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [{ _id: versionId, startDate: '2019-09-10T00:00:00' }],
    };
    ContractMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: contractId.toHexString() },
        { $set: flat({ 'versions.$[version]': versionToUpdate }) },
        { arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(versionId.toHexString()) }] }
      )
      .chain('lean')
      .once()
      .returns(contract);

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate);

    ContractMock.verify();
    sinon.assert.calledWith(updateOneMock, { _id: contractId.toHexString() }, { startDate: '2019-09-10T00:00:00' });
  });

  it('should update current and previous version', async () => {
    const previousVersionId = new ObjectID();
    const contract = {
      startDate: '2019-09-09T00:00:00',
      versions: [
        { _id: previousVersionId, startDate: '2019-08-01T00:00:00', endDate: '2019-09-05T00:00:00' },
        { _id: versionId, startDate: '2019-09-10T00:00:00' },
      ],
    };
    ContractMock.expects('findOneAndUpdate').chain('lean').once().returns(contract);

    await ContractHelper.updateVersion(contractId.toHexString(), versionId.toHexString(), versionToUpdate);

    ContractMock.verify();
    sinon.assert.calledWith(
      updateOneMock,
      { _id: contractId.toHexString() },
      { $set: { 'versions.$[version].endDate': '2019-09-09T21:59:59.999Z' } },
      { arrayFilters: [{ 'version._id': mongoose.Types.ObjectId(previousVersionId) }] }
    );
  });
});
