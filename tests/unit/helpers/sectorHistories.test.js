const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const SectorHistory = require('../../../src/models/SectorHistory');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

require('sinon-mongoose');

describe('createHistory', () => {
  let SectorHistoryMock;
  const auxiliary = new ObjectID();
  const company = new ObjectID();
  const sector = new ObjectID();

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    SectorHistoryMock.restore();
  });

  it('should create new sector history and update old one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company }).once();
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('updateOne')
      .withExactArgs(
        { _id: sectorHistory._id },
        { $set: { endDate: moment().subtract(1, 'd').endOf('day').toDate() } }
      )
      .once();

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);

    SectorHistoryMock.verify();
  });

  it('should return nothing if last sector history sector is same than new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector, startDate: '2019-09-10T00:00:00' };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .once()
      .returns(sectorHistory);
    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('create').never();

    const result = await SectorHistoryHelper.createHistory(auxiliary, sector.toHexString(), company);

    expect(result).not.toBeDefined();
    SectorHistoryMock.verify();
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
    SectorHistoryMock.expects('deleteOne').never();
    SectorHistoryMock.expects('updateOne').never();

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);

    SectorHistoryMock.verify();
  });

  it('should delete unrelevant last sector history', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID(), startDate: moment().startOf('day').toDate() };
    SectorHistoryMock.expects('findOne')
      .withExactArgs({ auxiliary, company, endDate: { $exists: false } })
      .chain('sort')
      .withExactArgs({ startDate: -1 })
      .chain('lean')
      .returns(sectorHistory);
    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('deleteOne').withExactArgs({ _id: sectorHistory._id }).once();
    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company });

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
