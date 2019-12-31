const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const SectoryHistory = require('../../../src/models/SectorHistory');
const SectorHistoryHelper = require('../../../src/helpers/sectorHistories');

require('sinon-mongoose');

describe('createHistory', () => {
  let SectorHistoryMock;
  let clock;
  const auxiliary = new ObjectID();
  const company = new ObjectID();
  const sector = new ObjectID();

  beforeEach(() => {
    SectorHistoryMock = sinon.mock(SectoryHistory);
    clock = sinon.useFakeTimers(new Date('2019-01-02'));
  });

  afterEach(() => {
    SectorHistoryMock.restore();
    clock.restore();
  });

  it('should create new sector history and update old one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector: new ObjectID() };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary, company })
      .chain('sort')
      .withExactArgs({ _id: -1 })
      .chain('lean')
      .returns(sectorHistory);

    SectorHistoryMock
      .expects('updateOne')
      .withExactArgs({ _id: sectorHistory._id }, { $set: { endDate: moment().subtract(1, 'd').toDate() } });

    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company });

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);

    SectorHistoryMock.verify();
  });

  it('should return nothing if last sector history sector is same than new one', async () => {
    const sectorHistory = { _id: new ObjectID(), sector };
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary, company })
      .chain('sort')
      .withExactArgs({ _id: -1 })
      .chain('lean')
      .returns(sectorHistory);

    SectorHistoryMock.expects('updateOne').never();
    SectorHistoryMock.expects('create').never();

    const result = await SectorHistoryHelper.createHistory(auxiliary, sector.toHexString(), company);

    expect(result).not.toBeDefined();
    SectorHistoryMock.verify();
  });

  it('should create sector history if it does not exist', async () => {
    SectorHistoryMock
      .expects('findOne')
      .withExactArgs({ auxiliary, company })
      .chain('sort')
      .withExactArgs({ _id: -1 })
      .chain('lean')
      .returns(null);

    SectorHistoryMock.expects('create').withExactArgs({ auxiliary, sector, company });

    await SectorHistoryHelper.createHistory(auxiliary, sector, company);

    SectorHistoryMock.verify();
  });
});
