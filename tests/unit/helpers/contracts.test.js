const sinon = require('sinon');
const expect = require('expect');
const moment = require('moment');
const { ObjectID } = require('mongodb');
require('sinon-mongoose');

const ContractHelper = require('../../../helpers/contracts');
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
    const result = await ContractHelper.endContract(contractId1, payload);
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
    const result = await ContractHelper.endContract(contractId1, payload);
    sinon.assert.called(ContractFindByIdStub);
    sinon.assert.called(contractSaveStub);
    sinon.assert.calledWith(ContractFindStub, { user: contracts[0].user });
    sinon.assert.calledWith(UserfindOneAndUpdateStub, { _id: contracts[0].user }, { $set: { inactivityDate: moment().add('1', 'months').startOf('M').toDate() } });
    expect(result.toObject()).toEqual(expect.objectContaining(updatedContract));
  });
});

describe('exportContractHistory', () => {
  const startDate = '2019-10-01T09:00:00';
  const endDate = '2019-11-01T09:00:00';
  let contractMock;
  beforeEach(() => {
    contractMock = sinon.mock(Contract);
  });
  afterEach(() => {
    contractMock.restore();
  });

  it('should return an array containing just the header', async () => {
    contractMock.expects('find')
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);

    const result = await ContractHelper.exportContractHistory(startDate, endDate);
    contractMock.verify();
    expect(result.length).toEqual(1);
    expect(result).toEqual([['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire']]);
  });

  it('should return an array with the header and 2 rows', async () => {
    const contracts = [
      {
        user: { identity: { title: 'M', lastname: 'Patate' } },
        versions: [
          { startDate: '2019-10-10T00:00:00', weeklyHours: 12, grossHourlyRate: 10.45 },
        ],
      },
      {
        user: { identity: { title: 'Mme', firstname: 'Patate' } },
        versions: [
          { startDate: '2019-09-08T00:00:00', endDate: '2019-10-07T00:00:00', weeklyHours: 10, grossHourlyRate: 10 },
          { startDate: '2019-10-08T00:00:00', endDate: '2019-11-07T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
          { startDate: '2019-11-08T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
        ],
      },
    ];

    contractMock.expects('find')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(contracts);

    const result = await ContractHelper.exportContractHistory(startDate, endDate);
    contractMock.verify();
    expect(result.length).toEqual(3);
    expect(result).toEqual([
      ['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', 'M', '', 'Patate', '10/10/2019', '', 10.45, 12],
      ['Avenant', 'Mme', 'Patate', '', '08/10/2019', '07/11/2019', 2, 14],
    ]);
  });
});
