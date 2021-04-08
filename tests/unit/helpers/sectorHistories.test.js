const sinon = require('sinon');
const expect = require('expect');
const Boom = require('@hapi/boom');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const SinonMongoose = require('../sinonMongoose');
const SectorHistory = require('../../../src/models/SectorHistory');
const Contract = require('../../../src/models/Contract');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

describe('updateHistoryOnSectorUpdate', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const companyId = new ObjectID();

  let findOne;
  let updateOne;
  let find;
  let createHistoryStub;

  beforeEach(() => {
    findOne = sinon.stub(SectorHistory, 'findOne');
    updateOne = sinon.stub(SectorHistory, 'updateOne');
    find = sinon.stub(Contract, 'find');
    createHistoryStub = sinon.stub(SectorHistoryHelper, 'createHistory');
  });

  afterEach(() => {
    findOne.restore();
    updateOne.restore();
    find.restore();
    createHistoryStub.restore();
  });

  it('should create sector history if no previous one', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([[]], ['sort', 'lean']));

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toBeUndefined();
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector: sector.toHexString() },
      companyId
    );
  });

  it('should return nothing if last sector history sector is same than new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector, startDate: '2019-09-10T00:00:00' };

    findOne.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([[{ _id: new ObjectID() }]], ['sort', 'lean']));

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual(null);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should return an error if no last sector history and has an ongoing contract', async () => {
    try {
      findOne.returns(SinonMongoose.stubChainedQueries([], ['lean']));
      find.returns(SinonMongoose.stubChainedQueries(
        [[{ _id: new ObjectID(), startDate: '2020-01-01T23:59:59' }]],
        ['sort', 'lean']
      ));

      await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);
    } catch (e) {
      expect(e).toEqual(Boom.badData());
    } finally {
      SinonMongoose.calledWithExactly(
        findOne,
        [
          {
            query: 'findOne',
            args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
          },
          { query: 'lean' },
        ]
      );
      sinon.assert.notCalled(createHistoryStub);
    }
  });

  it('should update sector history if auxiliary does not have contract', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };

    findOne.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([[]], ['sort', 'lean']));
    updateOne.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { sector: sector.toHexString() } }
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should update sector history if auxiliary is between contracts', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries(
      [[{ startDate: '2020-01-01T00:00:00', endDate: '2020-08-01T23:59:59' }, { startDate: moment().add(1, 'd') }]],
      ['sort', 'lean']
    ));
    createHistoryStub.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector: sector.toHexString() }, companyId
    );
  });

  it('should update sector history if many changes made on the same day', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day') };

    findOne.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([[{ _id: new ObjectID() }]], ['sort', 'lean']));
    updateOne.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { sector: sector.toHexString() } }
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should update sector history and create new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-10-10' };

    findOne.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries(
      [[{ _id: new ObjectID(), startDate: moment('2019-10-12').toDate() }]],
      ['sort', 'lean']
    ));
    updateOne.returns({ sector });
    createHistoryStub.returns({ auxiliary: auxiliaryId });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ auxiliary: auxiliaryId });
    sinon.assert.calledWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector: sector.toHexString() },
      companyId,
      moment().startOf('day').toDate()
    );
    SinonMongoose.calledWithExactly(findOne, [
      {
        query: 'findOne',
        args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
      },
      { query: 'lean' },
    ]);
    SinonMongoose.calledWithExactly(
      find, [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } }
    );
  });
});

describe('createHistoryOnContractCreation', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const newContract = { startDate: moment('2020-01-30') };
  const companyId = new ObjectID();

  let createHistoryStub;
  let findOne;
  let updateOne;

  beforeEach(() => {
    findOne = sinon.stub(SectorHistory, 'findOne');
    updateOne = sinon.stub(SectorHistory, 'updateOne');
    createHistoryStub = sinon.stub(SectorHistoryHelper, 'createHistory');
  });

  afterEach(() => {
    createHistoryStub.restore();
    findOne.restore();
    updateOne.restore();
  });

  it('should update sector history if exists without startDate', async () => {
    const user = { _id: auxiliaryId, sector };
    const existingHistory = { _id: new ObjectID(), sector };

    findOne.returns(SinonMongoose.stubChainedQueries([existingHistory], ['lean']));

    await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ startDate: { $exists: false }, auxiliary: auxiliaryId }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: existingHistory._id },
      { $set: { startDate: moment(newContract.startDate).startOf('day').toDate(), sector: user.sector } }
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should create sector history if does not exist without start date', async () => {
    const user = { _id: auxiliaryId, sector };

    findOne.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

    sinon.assert.calledOnceWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector },
      companyId,
      moment(newContract.startDate).startOf('day').toDate()
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ startDate: { $exists: false }, auxiliary: auxiliaryId }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(updateOne);
  });
});

describe('updateHistoryOnContractUpdate', () => {
  const auxiliaryId = new ObjectID();
  const contractId = new ObjectID();
  const newContract = { startDate: moment().add(1, 'month') };
  const companyId = new ObjectID();

  let findOne;
  let updateOne;
  let remove;
  let find;

  beforeEach(() => {
    findOne = sinon.stub(Contract, 'findOne');
    updateOne = sinon.stub(SectorHistory, 'updateOne');
    remove = sinon.stub(SectorHistory, 'remove');
    find = sinon.stub(SectorHistory, 'find');
  });

  afterEach(() => {
    findOne.restore();
    updateOne.restore();
    remove.restore();
    find.restore();
  });

  it('should update sector history if contract has not started yet', async () => {
    findOne.returns(
      SinonMongoose.stubChainedQueries([{ user: auxiliaryId, startDate: moment().add(2, 'month') }], ['lean'])
    );

    await SectorHistoryHelper.updateHistoryOnContractUpdate(contractId, newContract, companyId);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: contractId, company: companyId }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: auxiliaryId, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } }
    );
  });

  it('should update and remove sector history if contract has started', async () => {
    const sectorHistory = [{ _id: new ObjectID() }];

    findOne.returns(SinonMongoose.stubChainedQueries([{ user: auxiliaryId, startDate: '2019-01-01' }], ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['sort', 'limit', 'lean']));

    await SectorHistoryHelper.updateHistoryOnContractUpdate(contractId, newContract, companyId);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: contractId, company: companyId }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      remove,
      { auxiliary: auxiliaryId, endDate: { $gte: '2019-01-01', $lte: newContract.startDate } }
    );
    SinonMongoose.calledWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ company: companyId, auxiliary: auxiliaryId, startDate: { $gte: moment('2019-01-01').toDate() } }],
        },
        { query: 'sort', args: [{ startDate: 1 }] },
        { query: 'limit', args: [1] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: sectorHistory[0]._id },
      { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } }
    );
  });
});

describe('updateHistoryOnContractDeletion', () => {
  const contract = { user: new ObjectID(), startDate: '2020-01-01' };
  const companyId = new ObjectID();

  let findOne;
  let updateOne;
  let remove;

  beforeEach(() => {
    findOne = sinon.stub(SectorHistory, 'findOne');
    updateOne = sinon.stub(SectorHistory, 'updateOne');
    remove = sinon.stub(SectorHistory, 'remove');
  });

  afterEach(() => {
    findOne.restore();
    updateOne.restore();
    remove.restore();
  });

  it('should remove sector histories and update last one', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([{ startDate: '2020-10-10' }], ['lean']));

    await SectorHistoryHelper.updateHistoryOnContractDeletion(contract, companyId);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      remove,
      { auxiliary: contract.user, company: companyId, startDate: { $gte: contract.startDate, $lt: '2020-10-10' } }
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: contract.user, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $unset: { startDate: '' } }
    );
  });
});

describe('createHistory', () => {
  const auxiliaryId = new ObjectID();
  const sector = new ObjectID();
  const companyId = new ObjectID();

  let create;

  beforeEach(() => {
    create = sinon.stub(SectorHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create SectorHistory without startDate', async () => {
    const sectorHistory = { auxiliary: auxiliaryId, sector, company: companyId };

    create.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['toObject']));

    const result = await SectorHistoryHelper.createHistory({ _id: auxiliaryId, sector }, companyId);

    expect(result).toEqual(sectorHistory);
    SinonMongoose.calledWithExactly(
      create,
      [
        { query: 'create', args: [{ auxiliary: auxiliaryId, sector, company: companyId }] },
        { query: 'toObject' },
      ]
    );
  });

  it('should create SectorHistory with startDate', async () => {
    const sectorHistory = { auxiliary: auxiliaryId, sector, company: companyId, startDate: '2020-01-01' };

    create.returns(SinonMongoose.stubChainedQueries([sectorHistory], ['toObject']));

    const result = await SectorHistoryHelper.createHistory({ _id: auxiliaryId, sector }, companyId, '2020-01-01');

    expect(result).toEqual(sectorHistory);
    SinonMongoose.calledWithExactly(
      create,
      [
        { query: 'create', args: [{ auxiliary: auxiliaryId, sector, company: companyId, startDate: '2020-01-01' }] },
        { query: 'toObject' },
      ]
    );
  });
});

describe('updateEndDate', () => {
  let updateOne;

  beforeEach(() => {
    updateOne = sinon.stub(SectorHistory, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update sector history', async () => {
    const auxiliary = new ObjectID();
    const endDate = '2020-01-01';

    await SectorHistoryHelper.updateEndDate(auxiliary, endDate);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary, $or: [{ endDate: { $exists: false } }, { endDate: null }] },
      { $set: { endDate: moment(endDate).endOf('day').toDate() } }
    );
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
