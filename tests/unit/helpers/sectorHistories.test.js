const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const SectorHistory = require('../../../src/models/SectorHistory');
const User = require('../../../src/models/User');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

require('sinon-mongoose');

describe('createHistory', () => {
  let SectorHistoryMock;
  let UserMock;
  const auxiliary = new ObjectID();
  const company = new ObjectID();
  const sector = new ObjectID();

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
    UserMock = sinon.mock(User);
  });

  afterEach(() => {
    SectorHistoryMock.verify();
    UserMock.verify();
  });

  it('should create sector history if it does not exist', async () => {
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .once()
      .returns(null);
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company }).once();
    UserMock.expects('findOne').never();
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('updateOne').never();

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);
  });

  it('should return nothing if last sector history sector is same than new one and the user does not have a new contract', async () => {
    const sectorHistory = { _id: new ObjectID(), sector, startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    const startDate = moment().startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({ contracts: [{ _id: new ObjectID(), createdAt: '2019-01-01', startDate: '2019-01-01' }] });

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('create').never();

    const result = await SectorHistoryHelper.createHistory(auxiliary, sector.toHexString(), company);

    expect(result).not.toBeDefined();
  });

  it('should return nothing if creating a new contract to an auxiliary who already has one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector, startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .once()
      .returns(sectorHistory);

    const startDate = moment().startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({
        contracts: [
          { _id: new ObjectID(), createdAt: '2019-01-01', startDate: '2019-01-01' },
          { _id: new ObjectID(), createdAt: moment(), startDate: moment() },
        ],
      });

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('create').never();

    const result = await SectorHistoryHelper.createHistory(auxiliary, sector.toHexString(), company);

    expect(result).not.toBeDefined();
  });

  it('should delete unrelevant last sector history if endDate is before last SectorHistory startDate', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day').toDate() };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);
    const startDate = moment().startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({ contracts: [{ _id: new ObjectID(), createdAt: '2019-01-01', startDate: '2019-01-01' }] });

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').withExactArgs({ _id: sectorHistory._id }).once();
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company, startDate });

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);
  });

  it('should delete unrelevant last sector history if the user has a new contract and lsh does not have endDate', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day').toDate() };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);
    const startDate = moment('2019-12-01').startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: moment().startOf('day').toDate() } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({ contracts: [{ _id: new ObjectID(), createdAt: moment(), startDate }] });

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').withExactArgs({ _id: sectorHistory._id }).once();
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company, startDate });

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);
  });

  it('should delete unrelevant last sector history if the user has a contract that has not yet started and lsh does not have endDate', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day').toDate() };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);
    const startDate = moment().add(1, 'd').startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: moment().startOf('day').toDate() } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({ contracts: [{ _id: new ObjectID(), createdAt: moment(), startDate }] });

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').withExactArgs({ _id: sectorHistory._id }).once();
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company, startDate });

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);
  });

  it('should delete unrelevant last sector history if the user does not have a contract', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day').toDate() };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);
    const startDate = moment().startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({ contracts: [] });

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').withExactArgs({ _id: sectorHistory._id }).once();
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company, startDate });

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);
  });

  it('should create new sector history and update old one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);

    const startDate = moment().startOf('day').toDate();
    UserMock
      .expects('findOne')
      .withExactArgs({ _id: auxiliary })
      .chain('populate')
      .withExactArgs({
        path: 'contracts',
        match: { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: startDate } }] },
        sort: { startDate: -1 },
      })
      .chain('lean')
      .returns({ contracts: [{ _id: new ObjectID(), createdAt: '2019-01-01', startDate: '2019-01-01' }] });
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { _id: sectorHistory._id },
        { $set: { endDate: moment().subtract(1, 'd').endOf('day').toDate() } }
      )
      .once();
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company, startDate }).once();

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);

    SectorHistoryMock.verify();
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
