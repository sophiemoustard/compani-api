const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const SectorHistory = require('../../../src/models/SectorHistory');
const Contract = require('../../../src/models/Contract');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');
const { COMPANY_CONTRACT } = require('../../../src/helpers/constants');

require('sinon-mongoose');

describe('updateHistoryOnSectorUpdate', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const companyId = new ObjectID();

  let SectorHistoryMock;
  let ContractMock;
  let createStub;
  let updateStub;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
    ContractMock = sinon.mock(Contract);
    createStub = sinon.stub(SectorHistoryHelper, 'create');
    updateStub = sinon.stub(SectorHistoryHelper, 'update');
  });

  afterEach(() => {
    SectorHistoryMock.verify();
    ContractMock.verify();
    createStub.restore();
    updateStub.restore();
  });

  it('should return nothing if last sector history sector is same than new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector, startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, endDate: { $exists: false } })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).not.toBeDefined();
    sinon.assert.notCalled(updateStub);
    sinon.assert.notCalled(createStub);
  });

  it('should update sector history if auxiliary does not have contract', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, endDate: { $exists: false } })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock
      .expects('find')
      .withExactArgs({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([]);

    updateStub.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    sinon.assert.calledWithExactly(updateStub, auxiliaryId, { $set: { sector: sector.toHexString() } });
    sinon.assert.notCalled(createStub);
  });

  it('should update sector history if auxiliary contract has not started yet', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, endDate: { $exists: false } })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock
      .expects('find')
      .withExactArgs({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([{ startDate: moment().add(1, 'd') }]);

    updateStub.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    sinon.assert.calledWithExactly(updateStub, auxiliaryId, { $set: { sector: sector.toHexString() } });
    sinon.assert.notCalled(createStub);
  });

  it('should update sector history if many changes made on the same day', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day') };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, endDate: { $exists: false } })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock
      .expects('find')
      .withExactArgs({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([{ _id: new ObjectID() }]);

    updateStub.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    sinon.assert.calledWithExactly(updateStub, auxiliaryId, { $set: { sector: sector.toHexString() } });
    sinon.assert.notCalled(createStub);
  });

  it('should update sector history and create new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-10-10' };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, endDate: { $exists: false } })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock
      .expects('find')
      .withExactArgs({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([{ _id: new ObjectID() }]);

    updateStub.returns({ sector });
    createStub.returns({ auxiliary: auxiliaryId });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ auxiliary: auxiliaryId });
    sinon.assert.calledWithExactly(
      updateStub,
      auxiliaryId,
      { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } }
    );
    sinon.assert.calledWithExactly(
      createStub,
      auxiliaryId,
      sector.toHexString(),
      companyId,
      moment().startOf('day').toDate()
    );
  });
});

describe('createHistoryOnContractCreation', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const newContract = { startDate: moment('2020-01-30') };
  const companyId = new ObjectID();

  let ContractMock;
  let createStub;
  let updateStub;

  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    createStub = sinon.stub(SectorHistoryHelper, 'create');
    updateStub = sinon.stub(SectorHistoryHelper, 'update');
  });

  afterEach(() => {
    ContractMock.verify();
    createStub.restore();
    updateStub.restore();
  });

  it('should update sector history if it is auxiliary first contract', async () => {
    ContractMock
      .expects('find')
      .withExactArgs({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId })
      .chain('lean')
      .returns([{ _id: new ObjectID(), startDate: '2019-10-10' }]);

    updateStub.returns({ sector });

    const result = await SectorHistoryHelper.createHistoryOnContractCreation(
      auxiliaryId,
      sector,
      newContract,
      companyId
    );

    expect(result).toEqual({ sector });
    sinon.assert.calledWithExactly(updateStub, auxiliaryId, { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } });
    sinon.assert.notCalled(createStub);
  });

  it('should create sector history if auxiliary already had contracts', async () => {
    ContractMock
      .expects('find')
      .withExactArgs({ user: auxiliaryId, status: COMPANY_CONTRACT, company: companyId })
      .chain('lean')
      .returns([{ _id: new ObjectID(), endDate: '2019-10-10' }, { _id: new ObjectID(), startDate: '2019-11-10' }]);

    createStub.returns({ sector });

    const result = await SectorHistoryHelper.createHistoryOnContractCreation(
      auxiliaryId,
      sector,
      newContract,
      companyId
    );

    expect(result).toEqual({ sector });
    sinon.assert.notCalled(updateStub);
    sinon.assert.calledWithExactly(
      createStub,
      auxiliaryId,
      sector,
      companyId,
      moment(newContract.startDate).startOf('day').toDate()
    );
  });
});

describe('updateHistoryOnContractUpdate', () => {
  const auxiliaryId = new ObjectID();
  const contractId = new ObjectID();
  const newContract = { startDate: moment('2020-01-30') };
  const companyId = new ObjectID();

  let ContractMock;
  let SectorHistoryMock;
  let updateStub;

  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    SectorHistoryMock = sinon.mock(SectorHistory);
    updateStub = sinon.stub(SectorHistoryHelper, 'update');
  });

  afterEach(() => {
    ContractMock.verify();
    SectorHistoryMock.verify();
    updateStub.restore();
  });

  it('should update sector history if contract has not started yet', async () => {
    ContractMock
      .expects('findOne')
      .withExactArgs({ _id: contractId, company: companyId })
      .chain('lean')
      .returns({ user: auxiliaryId, startDate: '2020-02-26' });

    updateStub.returns();

    await SectorHistoryHelper.updateHistoryOnContractUpdate(
      contractId,
      newContract,
      companyId
    );

    sinon.assert.calledWithExactly(
      updateStub,
      auxiliaryId,
      { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } }
    );
  });

  it('should update and remove sector history if contract has started', async () => {
    ContractMock
      .expects('findOne')
      .withExactArgs({ _id: contractId, company: companyId })
      .chain('lean')
      .returns({ user: auxiliaryId, startDate: '2019-01-01' });

    updateStub.returns();

    SectorHistoryMock
      .expects('remove')
      .withExactArgs({
        auxiliary: auxiliaryId,
        endDate: { $gte: '2019-01-01', $lte: newContract.startDate },
      })
      .returns();

    const sectorHistory = [{ _id: new ObjectID() }];
    SectorHistoryMock
      .expects('find')
      .withExactArgs({ company: companyId, auxiliary: auxiliaryId, startDate: { $gte: moment('2019-01-01').toDate() } })
      .chain('sort')
      .withExactArgs({ startDate: 1 })
      .chain('limit')
      .withExactArgs(1)
      .chain('lean')
      .returns(sectorHistory);

    SectorHistoryMock
      .expects('updateOne')
      .withExactArgs(
        { _id: sectorHistory[0]._id },
        { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } }
      );

    await SectorHistoryHelper.updateHistoryOnContractUpdate(
      contractId,
      newContract,
      companyId
    );
  });
});

describe('updateHistoryOnContractDeletion', () => {
  const contract = { user: new ObjectID(), startDate: '2020-01-01' };
  const companyId = new ObjectID();

  let SectorHistoryMock;
  let updateStub;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
    updateStub = sinon.stub(SectorHistoryHelper, 'update');
  });

  afterEach(() => {
    SectorHistoryMock.verify();
    updateStub.restore();
  });

  it('should remove sector histories and update last one', async () => {
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: contract.user, endDate: { $exists: false } })
      .returns({ startDate: '2020-10-10' });

    SectorHistoryMock
      .expects('remove')
      .withExactArgs({
        auxiliary: contract.user,
        company: companyId,
        startDate: { $gte: contract.startDate, $lt: '2020-10-10' },
      })
      .returns();
    updateStub.returns();

    await SectorHistoryHelper.updateHistoryOnContractDeletion(contract, companyId);

    sinon.assert.calledWithExactly(updateStub, contract.user, { $unset: { startDate: '' } });
  });
});

describe('create', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const companyId = new ObjectID();

  let SectorHistoryMock;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    SectorHistoryMock.verify();
  });

  it('should create SectorHistory without startDate', async () => {
    const payloadSectorHistory = { auxiliary: auxiliaryId, sector, company: companyId };
    const sectorHistory = new SectorHistory({ auxiliary: auxiliaryId, sector, company: companyId });
    const sectorHistoryMock = sinon.mock(sectorHistory);

    SectorHistoryMock
      .expects('create')
      .withExactArgs(payloadSectorHistory)
      .returns(sectorHistory);
    sectorHistoryMock.expects('toObject').once().returns(payloadSectorHistory);

    const result = await SectorHistoryHelper.create(auxiliaryId, sector, companyId);

    expect(result).toEqual(payloadSectorHistory);
    sectorHistoryMock.verify();
  });

  it('should create SectorHistory with startDate', async () => {
    const payloadSectorHistory = {
      auxiliary: auxiliaryId,
      sector,
      company: companyId,
      startDate: '2020-01-01',
    };
    const sectorHistory = new SectorHistory(payloadSectorHistory);
    const sectorHistoryMock = sinon.mock(sectorHistory);
    SectorHistoryMock
      .expects('create')
      .withExactArgs(payloadSectorHistory)
      .returns(sectorHistory);
    sectorHistoryMock.expects('toObject').once().returns(payloadSectorHistory);

    const result = await SectorHistoryHelper.create(auxiliaryId, sector, companyId, '2020-01-01');

    expect(result).toEqual(payloadSectorHistory);
    sectorHistoryMock.verify();
  });
});

describe('update', () => {
  const auxiliaryId = new ObjectID();

  let SectorHistoryMock;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    SectorHistoryMock.verify();
  });

  it('should update sector history', async () => {
    const payload = { $set: { startDate: '2020-01-01' } };
    SectorHistoryMock
      .expects('updateOne')
      .withExactArgs({ auxiliary: auxiliaryId, endDate: { $exists: false } }, payload)
      .returns();

    await SectorHistoryHelper.update(auxiliaryId, payload);
  });
});

describe('updateEndDate', () => {
  let SectorHistoryMock;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    SectorHistoryMock.restore();
  });

  it('should update sector history', async () => {
    const auxiliary = new ObjectID();
    const endDate = '2020-01-01';
    SectorHistoryMock
      .expects('updateOne')
      .withExactArgs(
        { auxiliary, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $set: { endDate: moment(endDate).endOf('day').toDate() } }
      );

    await SectorHistoryHelper.updateEndDate(auxiliary, endDate);

    SectorHistoryMock.verify();
  });
});
