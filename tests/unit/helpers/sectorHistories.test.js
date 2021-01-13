const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const SinonMongoose = require('../sinonMongoose');
const SectorHistory = require('../../../src/models/SectorHistory');
const Contract = require('../../../src/models/Contract');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

require('sinon-mongoose');

describe('updateHistoryOnSectorUpdate', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const companyId = new ObjectID();

  let SectorHistoryMock;
  let ContractMock;
  let createHistoryStub;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
    ContractMock = sinon.mock(Contract);
    createHistoryStub = sinon.stub(SectorHistoryHelper, 'createHistory');
  });

  afterEach(() => {
    SectorHistoryMock.restore();
    ContractMock.restore();
    createHistoryStub.restore();
  });

  it('should create sector history if no previous one', async () => {
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .once()
      .returns(null);

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toBeUndefined();
    sinon.assert.calledWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector: sector.toHexString() },
      companyId,
      moment().startOf('day').toDate()
    );
    SectorHistoryMock.verify();
    ContractMock.verify();
  });

  it('should return nothing if last sector history sector is same than new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector, startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual(null);
    sinon.assert.notCalled(createHistoryStub);
    SectorHistoryMock.verify();
    ContractMock.verify();
  });

  it('should update sector history if auxiliary does not have contract', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock.expects('find')
      .withExactArgs({
        user: auxiliaryId,
        company: companyId,
        $or: [{ endDate: { $exists: false } }, { endDate: null }],
      })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([]);

    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $set: { sector: sector.toHexString() } }
      )
      .returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    sinon.assert.notCalled(createHistoryStub);
    SectorHistoryMock.verify();
    ContractMock.verify();
  });

  it('should update sector history if auxiliary contract has not started yet', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock.expects('find')
      .withExactArgs({
        user: auxiliaryId,
        company: companyId,
        $or: [{ endDate: { $exists: false } }, { endDate: null }],
      })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([{ startDate: moment().add(1, 'd') }]);

    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $set: { sector: sector.toHexString() } }
      )
      .returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    sinon.assert.notCalled(createHistoryStub);
    SectorHistoryMock.verify();
    ContractMock.verify();
  });

  it('should update sector history if many changes made on the same day', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day') };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock.expects('find')
      .withExactArgs({
        user: auxiliaryId,
        company: companyId,
        $or: [{ endDate: { $exists: false } }, { endDate: null }],
      })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([{ _id: new ObjectID() }]);

    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $set: { sector: sector.toHexString() } }
      )
      .returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    sinon.assert.notCalled(createHistoryStub);
    SectorHistoryMock.verify();
    ContractMock.verify();
  });

  it('should update sector history and create new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-10-10' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    ContractMock.expects('find')
      .withExactArgs({
        user: auxiliaryId,
        company: companyId,
        $or: [{ endDate: { $exists: false } }, { endDate: null }],
      })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns([{ _id: new ObjectID(), startDate: moment('2019-10-12').toDate() }]);

    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } }
      )
      .returns({ sector });
    createHistoryStub.returns({ auxiliary: auxiliaryId });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ auxiliary: auxiliaryId });
    sinon.assert.calledWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector: sector.toHexString() },
      companyId,
      moment().startOf('day').toDate()
    );
    SectorHistoryMock.verify();
    ContractMock.verify();
  });
});

describe('createHistoryOnContractCreation', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const newContract = { startDate: moment('2020-01-30') };
  const companyId = new ObjectID();

  let SectorHistoryMock;
  let createHistoryStub;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
    createHistoryStub = sinon.stub(SectorHistoryHelper, 'createHistory');
  });

  afterEach(() => {
    SectorHistoryMock.restore();
    createHistoryStub.restore();
  });

  it('should update sector history if exists without startDate', async () => {
    const user = { _id: auxiliaryId, sector };
    const existingHistory = { _id: new ObjectID(), sector };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ startDate: { $exists: false }, auxiliary: auxiliaryId })
      .chain('lean')
      .once()
      .returns(existingHistory);
    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { _id: existingHistory._id },
        { $set: { startDate: moment(newContract.startDate).startOf('day').toDate(), sector: user.sector } }
      );

    await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

    sinon.assert.notCalled(createHistoryStub);
    SectorHistoryMock.verify();
  });

  it('should create sector history if does not exist without start date', async () => {
    const user = { _id: auxiliaryId, sector };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ startDate: { $exists: false }, auxiliary: auxiliaryId })
      .chain('lean')
      .once()
      .returns(null);
    SectorHistoryMock.expects('updateOne').never();

    await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

    sinon.assert.calledWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector },
      companyId,
      moment(newContract.startDate).startOf('day').toDate()
    );
    SectorHistoryMock.verify();
  });
});

describe('updateHistoryOnContractUpdate', () => {
  const auxiliaryId = new ObjectID();
  const contractId = new ObjectID();
  const newContract = { startDate: moment('2020-01-30') };
  const companyId = new ObjectID();

  let ContractMock;
  let SectorHistoryMock;

  beforeEach(() => {
    ContractMock = sinon.mock(Contract);
    SectorHistoryMock = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    ContractMock.verify();
    SectorHistoryMock.verify();
  });

  it('should update sector history if contract has not started yet', async () => {
    ContractMock
      .expects('findOne')
      .withExactArgs({ _id: contractId, company: companyId })
      .chain('lean')
      .returns({ user: auxiliaryId, startDate: '2020-02-26' });

    SectorHistoryMock
      .expects('updateOne')
      .withExactArgs(
        { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } }
      )
      .returns();

    await SectorHistoryHelper.updateHistoryOnContractUpdate(contractId, newContract, companyId);
  });

  it('should update and remove sector history if contract has started', async () => {
    ContractMock
      .expects('findOne')
      .withExactArgs({ _id: contractId, company: companyId })
      .chain('lean')
      .returns({ user: auxiliaryId, startDate: '2019-01-01' });

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

    await SectorHistoryHelper.updateHistoryOnContractUpdate(contractId, newContract, companyId);
  });
});

describe('updateHistoryOnContractDeletion', () => {
  const contract = { user: new ObjectID(), startDate: '2020-01-01' };
  const companyId = new ObjectID();

  let SectorHistoryMock;

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    SectorHistoryMock.verify();
  });

  it('should remove sector histories and update last one', async () => {
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] })
      .chain('lean')
      .returns({ startDate: '2020-10-10' });

    SectorHistoryMock
      .expects('remove')
      .withExactArgs({
        auxiliary: contract.user,
        company: companyId,
        startDate: { $gte: contract.startDate, $lt: '2020-10-10' },
      })
      .returns();

    SectorHistoryMock
      .expects('updateOne')
      .withExactArgs(
        { auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
        { $unset: { startDate: '' } }
      )
      .returns();

    await SectorHistoryHelper.updateHistoryOnContractDeletion(contract, companyId);
  });
});

describe('createHistory', () => {
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

    const result = await SectorHistoryHelper.createHistory({ _id: auxiliaryId, sector }, companyId);

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

    const result = await SectorHistoryHelper.createHistory({ _id: auxiliaryId, sector }, companyId, '2020-01-01');

    expect(result).toEqual(payloadSectorHistory);
    sectorHistoryMock.verify();
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

describe('getAuxiliarySectors', () => {
  let sectorHistoryFind;
  beforeEach(() => {
    sectorHistoryFind = sinon.stub(SectorHistory, 'find');
  });

  afterEach(() => {
    sectorHistoryFind.restore();
  });

  it('should return auxiliary sectors on a time range', async () => {
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const sectorId1 = new ObjectID();
    const sectorId2 = new ObjectID();
    sectorHistoryFind.returns(SinonMongoose.stubChainedQueries(
      [[{ sector: sectorId1 }, { sector: sectorId1 }, { sector: sectorId2 }]],
      ['lean']
    ));

    const result = await SectorHistoryHelper.getAuxiliarySectors(auxiliaryId, companyId, '2020-01-01', '2020-02-01');

    expect(result).toEqual([sectorId1.toHexString(), sectorId2.toHexString()]);
    SinonMongoose.calledWithExactly(
      sectorHistoryFind,
      [
        {
          query: 'find',
          args: [
            {
              company: companyId,
              auxiliary: auxiliaryId,
              startDate: { $lt: '2020-02-01' },
              $or: [{ endDate: { $gt: '2020-01-01' } }, { endDate: { $exists: false } }],
            },
            { sector: 1 },
          ],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array if no sector on the time range', async () => {
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    sectorHistoryFind.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    const result = await SectorHistoryHelper.getAuxiliarySectors(auxiliaryId, companyId, '2020-01-01', '2020-02-02');

    expect(result).toEqual([]);
  });
});
