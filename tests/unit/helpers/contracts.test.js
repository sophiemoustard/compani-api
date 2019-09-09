const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');
require('sinon-mongoose');

const { endContract } = require('../../../helpers/contracts');
const Contract = require('../../../models/Contract');
const User = require('../../../models/User');

describe('endContract', () => {
  let ContractFindByIdStub;
  let ContractFindStub;
  let UserfindOneAndUpdateStub;
  let newContract;
  let contractSaveStub;
  const contractId1 = new ObjectID();
  const contractId2 = new ObjectID();
  const payload = {
    endDate: moment().toDate(),
    endNotificationDate: moment().toDate(),
    endReason: 'test',
    otherMisc: 'test',
  };

  const contracts = [{
    endDate: null,
    user: new ObjectID(),
    startDate: moment('2018-12-03T23:00:00.000Z').toDate(),
    status: 'contract_with_company',
    _id: contractId1,
    versions: [
      {
        createdAt: moment('2018-12-04T16:34:04.144Z').toDate(),
        endDate: null,
        _id: new ObjectID(),
        signature: {
          signedBy: { auxiliary: false, other: false },
        },
      },
    ],
  }, {
    endDate: null,
    user: new ObjectID(),
    startDate: moment('2019-05-06T23:00:00.000Z').toDate(),
    status: 'contract_with_customer',
    _id: contractId2,
    versions: [
      {
        createdAt: moment('2019-05-04T16:34:04.144Z').toDate(),
        endDate: null,
        _id: new ObjectID(),
        signature: {
          signedBy: { auxiliary: false, other: false },
        },
      },
    ],
  }];
  beforeEach(() => {
    newContract = new Contract(contracts[0]);
    contractSaveStub = sinon.stub(newContract, 'save');
    ContractFindByIdStub = sinon.stub(Contract, 'findById');
    ContractFindStub = sinon.stub(Contract, 'find');
    UserfindOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate');
  });
  afterEach(() => {
    ContractFindByIdStub.restore();
    ContractFindStub.restore();
    contractSaveStub.restore();
    UserfindOneAndUpdateStub.restore();
  });

  it('should end contract', async () => {
    ContractFindByIdStub.returns(newContract);
    const updatedContract = { ...contracts[0], ...payload, versions: [{ ...contracts[0].versions[0], endDate: payload.endDate }] };
    contractSaveStub.returns(updatedContract);
    ContractFindStub.returns([updatedContract, contracts[1]]);
    const result = await endContract(contractId1, payload);
    sinon.assert.called(ContractFindByIdStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: contracts[0].user });
    expect(result.toObject()).toEqual(expect.objectContaining(updatedContract));
  });

  it('should end contract and set inactivity date for user if all contracts are ended', async () => {
    ContractFindByIdStub.returns(newContract);
    const updatedContract = { ...contracts[0], ...payload, versions: [{ ...contracts[0].versions[0], endDate: payload.endDate }] };
    contractSaveStub.returns(updatedContract);
    ContractFindStub.returns([updatedContract, { ...contracts[1], endDate: moment().toDate }]);
    const result = await endContract(contractId1, payload);
    sinon.assert.called(ContractFindByIdStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: contracts[0].user });
    sinon.assert.calledWith(UserfindOneAndUpdateStub, { _id: contracts[0].user }, { $set: { inactivityDate: moment().add('1', 'months').startOf('M').toDate() } });
    expect(result.toObject()).toEqual(expect.objectContaining(updatedContract));
  });
});
