const sinon = require('sinon');
const expect = require('expect');
const Boom = require('@hapi/boom');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const SinonMongoose = require('../sinonMongoose');
const SectorHistory = require('../../../src/models/SectorHistory');
const Contract = require('../../../src/models/Contract');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

describe('updateHistoryOnSectorUpdate', () => {
  const auxiliaryId = new ObjectId();
  const sector = new ObjectId();
  const companyId = new ObjectId();

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

  it('should create sector history if no previous one and not in contract', async () => {
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();

    findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([], ['sort', 'lean']));

    await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' },

      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector: sector.toHexString() },
      companyId
    );
    sinon.assert.notCalled(updateOne);
  });

  it('should return nothing if last sector history sector is same than new one', async () => {
    const sectorHistory = { _id: new ObjectId(), sector, startDate: '2019-09-10T00:00:00' };
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();

    findOne.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([{ _id: new ObjectId() }], ['sort', 'lean']));

    await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(createHistoryStub);
    sinon.assert.notCalled(updateOne);
  });

  it('should return an error if no last sector history and has an ongoing contract', async () => {
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
    try {
      findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
      find.returns(SinonMongoose.stubChainedQueries(
        [{ _id: new ObjectId(), startDate: '2020-01-01T23:59:59' }],
        ['sort', 'lean']
      ));

      await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('No last sector history for auxiliary in contract'));
    } finally {
      SinonMongoose.calledOnceWithExactly(
        findOne,
        [
          {
            query: 'findOne',
            args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
          },
          { query: 'lean' },

        ]
      );
      SinonMongoose.calledOnceWithExactly(
        find,
        [
          {
            query: 'find',
            args: [
              { user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] },
            ],
          },
          { query: 'sort', args: [{ startDate: -1 }] },
          { query: 'lean' },
        ]
      );
      sinon.assert.notCalled(createHistoryStub);
      sinon.assert.notCalled(updateOne);
    }
  });

  it('should update sector history if auxiliary does not have contract', async () => {
    const sectorHistory = { _id: new ObjectId(), sector: new ObjectId(), startDate: '2019-09-10T00:00:00' };
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();

    findOne.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([], ['sort', 'lean']));
    updateOne.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: sectorHistory._id },
      { $set: { sector: sector.toHexString() } }
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should update sector history if auxiliary is between contracts', async () => {
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
    const sectorHistory = { _id: new ObjectId(), sector: new ObjectId() };
    findOne.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries(
      [{ startDate: '2020-01-01T00:00:00', endDate: '2020-08-01T23:59:59' }, { startDate: moment().add(1, 'd') }],
      ['sort', 'lean']
    ));
    updateOne.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: sectorHistory._id },
      { $set: { sector: sector.toHexString() } }
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should update sector history if many changes made on the same day', async () => {
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
    const sectorHistory = { _id: new ObjectId(), sector: new ObjectId(), startDate: moment().startOf('day') };

    findOne.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries([{ _id: new ObjectId() }], ['sort', 'lean']));
    updateOne.returns({ sector });

    const result = await SectorHistoryHelper.updateHistoryOnSectorUpdate(auxiliaryId, sector.toHexString(), companyId);

    expect(result).toEqual({ sector });
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: sectorHistory._id },
      { $set: { sector: sector.toHexString() } }
    );
    sinon.assert.notCalled(createHistoryStub);
  });

  it('should update sector history and create new one', async () => {
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
    const sectorHistory = { _id: new ObjectId(), sector: new ObjectId(), startDate: '2019-10-10' };

    findOne.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries(
      [{ _id: new ObjectId(), startDate: moment('2019-10-12').toDate() }],
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
      moment().startOf('day').toDate(),
      undefined
    );
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: sectorHistory._id },
      { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } }
    );
  });

  it('should update sector history and create new one if existing history has endDate in the futur', async () => {
    const yesterday = moment().subtract(1, 'day').endOf('day').toDate();
    const contractEndDate = CompaniDate().oldAdd(4, 'days').toDate();
    const sectorHistory = {
      _id: new ObjectId(),
      sector: new ObjectId(),
      startDate: '2019-10-10T00:00:00',
      endDate: contractEndDate,
    };

    findOne.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries(
      [{ _id: new ObjectId(), startDate: '2019-10-12T00:00:00', endDate: contractEndDate }],
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
      moment().startOf('day').toDate(),
      contractEndDate
    );
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        {
          query: 'findOne',
          args: [{ auxiliary: auxiliaryId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        {
          query: 'find',
          args: [{ user: auxiliaryId, company: companyId, $or: [{ endDate: { $gt: yesterday } }, { endDate: null }] }],
        },
        { query: 'sort', args: [{ startDate: -1 }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: sectorHistory._id },
      { $set: { endDate: moment().subtract(1, 'day').endOf('day').toDate() } }
    );
  });
});

describe('createHistoryOnContractCreation', () => {
  const auxiliaryId = new ObjectId();
  const sector = new ObjectId();
  const newContract = { startDate: moment('2020-01-30') };
  const companyId = new ObjectId();

  let createHistoryStub;
  let findOne;
  let countDocuments;
  let updateOne;

  beforeEach(() => {
    countDocuments = sinon.stub(SectorHistory, 'countDocuments');
    findOne = sinon.stub(SectorHistory, 'findOne');
    updateOne = sinon.stub(SectorHistory, 'updateOne');
    createHistoryStub = sinon.stub(SectorHistoryHelper, 'createHistory');
  });

  afterEach(() => {
    countDocuments.restore();
    createHistoryStub.restore();
    findOne.restore();
    updateOne.restore();
  });

  it('should update sector history if exists without startDate', async () => {
    const user = { _id: auxiliaryId, sector };
    const existingHistory = { _id: new ObjectId(), sector };

    countDocuments.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    findOne.returns(SinonMongoose.stubChainedQueries(existingHistory, ['lean']));

    await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

    SinonMongoose.calledOnceWithExactly(
      countDocuments,
      [
        {
          query: 'countDocuments',
          args: [{ startDate: { $exists: true }, endDate: { $exists: false }, auxiliary: user._id }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
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

    countDocuments.returns(SinonMongoose.stubChainedQueries(null, ['lean']));
    findOne.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

    SinonMongoose.calledOnceWithExactly(
      countDocuments,
      [
        {
          query: 'countDocuments',
          args: [{ startDate: { $exists: true }, endDate: { $exists: false }, auxiliary: user._id }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      createHistoryStub,
      { _id: auxiliaryId, sector },
      companyId,
      moment(newContract.startDate).startOf('day').toDate()
    );
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ startDate: { $exists: false }, auxiliary: auxiliaryId }] },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(updateOne);
  });

  it('should return an error if there is an existing sector history with a startDate without endDate', async () => {
    const user = { _id: auxiliaryId, sector };
    try {
      const existingWrongHistory = { _id: new ObjectId(), sector };

      countDocuments.returns(SinonMongoose.stubChainedQueries(existingWrongHistory, ['lean']));

      await SectorHistoryHelper.createHistoryOnContractCreation(user, newContract, companyId);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('There is a sector history with a startDate without an endDate'));
    } finally {
      SinonMongoose.calledOnceWithExactly(
        countDocuments,
        [
          {
            query: 'countDocuments',
            args: [{ startDate: { $exists: true }, endDate: { $exists: false }, auxiliary: user._id }],
          },
          { query: 'lean' },
        ]
      );
      sinon.assert.notCalled(findOne);
      sinon.assert.notCalled(updateOne);
      sinon.assert.notCalled(createHistoryStub);
    }
  });
});

describe('updateHistoryOnContractUpdate', () => {
  const auxiliaryId = new ObjectId();
  const contractId = new ObjectId();
  const newContract = { startDate: moment().add(1, 'month') };
  const companyId = new ObjectId();

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
      SinonMongoose.stubChainedQueries({ user: auxiliaryId, startDate: moment().add(2, 'month') }, ['lean'])
    );

    await SectorHistoryHelper.updateHistoryOnContractUpdate(contractId, newContract, companyId);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: contractId, company: companyId }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: auxiliaryId, endDate: null },
      { $set: { startDate: moment(newContract.startDate).startOf('day').toDate() } }
    );
  });

  it('should update and remove sector history if contract has started', async () => {
    const sectorHistory = [{ _id: new ObjectId() }];

    findOne.returns(SinonMongoose.stubChainedQueries({ user: auxiliaryId, startDate: '2019-01-01' }, ['lean']));
    find.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['sort', 'limit', 'lean']));

    await SectorHistoryHelper.updateHistoryOnContractUpdate(contractId, newContract, companyId);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: contractId, company: companyId }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      remove,
      { auxiliary: auxiliaryId, endDate: { $gte: '2019-01-01', $lte: newContract.startDate } }
    );
    SinonMongoose.calledOnceWithExactly(
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
  const contract = { user: new ObjectId(), startDate: '2020-01-01' };
  const companyId = new ObjectId();

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
    findOne.returns(SinonMongoose.stubChainedQueries({ startDate: '2020-10-10' }, ['lean']));

    await SectorHistoryHelper.updateHistoryOnContractDeletion(contract, companyId);

    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ auxiliary: contract.user, endDate: null }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      remove,
      { auxiliary: contract.user, company: companyId, startDate: { $gte: contract.startDate, $lt: '2020-10-10' } }
    );
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary: contract.user, endDate: null },
      { $unset: { startDate: '' } }
    );
  });
});

describe('createHistory', () => {
  const auxiliaryId = new ObjectId();
  const sector = new ObjectId();
  const companyId = new ObjectId();

  let create;

  beforeEach(() => {
    create = sinon.stub(SectorHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create SectorHistory without startDate', async () => {
    const sectorHistory = { auxiliary: auxiliaryId, sector, company: companyId };

    create.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['toObject']));

    const result = await SectorHistoryHelper.createHistory({ _id: auxiliaryId, sector }, companyId);

    expect(result).toEqual(sectorHistory);
    SinonMongoose.calledOnceWithExactly(
      create,
      [
        { query: 'create', args: [{ auxiliary: auxiliaryId, sector, company: companyId }] },
        { query: 'toObject' },
      ]
    );
  });

  it('should create SectorHistory with startDate', async () => {
    const sectorHistory = { auxiliary: auxiliaryId, sector, company: companyId, startDate: '2020-01-01' };

    create.returns(SinonMongoose.stubChainedQueries(sectorHistory, ['toObject']));

    const result = await SectorHistoryHelper.createHistory({ _id: auxiliaryId, sector }, companyId, '2020-01-01');

    expect(result).toEqual(sectorHistory);
    SinonMongoose.calledOnceWithExactly(
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
    const auxiliary = new ObjectId();
    const endDate = '2020-01-01';

    await SectorHistoryHelper.updateEndDate(auxiliary, endDate);

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { auxiliary, endDate: null },
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
    const auxiliaryId = new ObjectId();
    const companyId = new ObjectId();
    const sectorId1 = new ObjectId();
    const sectorId2 = new ObjectId();
    sectorHistoryFind.returns(SinonMongoose.stubChainedQueries(
      [{ sector: sectorId1 }, { sector: sectorId1 }, { sector: sectorId2 }],
      ['lean']
    ));

    const result = await SectorHistoryHelper.getAuxiliarySectors(auxiliaryId, companyId, '2020-01-01', '2020-02-01');

    expect(result).toEqual([sectorId1.toHexString(), sectorId2.toHexString()]);
    SinonMongoose.calledOnceWithExactly(
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
    const auxiliaryId = new ObjectId();
    const companyId = new ObjectId();
    sectorHistoryFind.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    const result = await SectorHistoryHelper.getAuxiliarySectors(auxiliaryId, companyId, '2020-01-01', '2020-02-02');

    expect(result).toEqual([]);
  });
});
