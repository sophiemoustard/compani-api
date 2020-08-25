const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Sector = require('../../../src/models/Sector');
const SectorsHelper = require('../../../src/helpers/sectors');

require('sinon-mongoose');

describe('create', () => {
  it('should create a new sector', async () => {
    const payload = { name: 'toto' };
    const companyId = new ObjectID();
    const payloadWithCompany = { ...payload, company: companyId };
    const credentials = { company: { _id: companyId } };

    const newSector = new Sector({ ...payload, company: companyId });
    const newSectorMock = sinon.mock(newSector);
    const SectorMock = sinon.mock(Sector);

    SectorMock.expects('countDocuments').once().returns(0);
    SectorMock.expects('create')
      .withExactArgs(payloadWithCompany)
      .once()
      .returns(newSector);
    newSectorMock.expects('toObject').once().returns(payloadWithCompany);

    const result = await SectorsHelper.create(payload, credentials);

    expect(result).toMatchObject(payloadWithCompany);
    SectorMock.verify();
    newSectorMock.verify();
  });

  it('should not create a new sector as name already exists', async () => {
    const payload = { name: 'toto' };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    const SectorMock = sinon.mock(Sector);

    SectorMock.expects('countDocuments').once().returns(2);
    SectorMock.expects('create').never();

    try {
      await SectorsHelper.create(payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      SectorMock.verify();
    }
  });
});

describe('list', () => {
  it('should list sectors', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const SectorMock = sinon.mock(Sector);

    SectorMock.expects('find').withExactArgs({ company: credentials.company._id }).chain('lean');

    await SectorsHelper.list(credentials);

    SectorMock.verify();
  });
});

describe('update', () => {
  let SectorMock;
  beforeEach(() => {
    SectorMock = sinon.mock(Sector);
  });
  afterEach(() => {
    SectorMock.restore();
  });

  it('should update a sector', async () => {
    const payload = { name: 'Tutu' };
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    SectorMock.expects('countDocuments').withExactArgs({ name: 'Tutu', company: companyId }).once().returns(0);
    SectorMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: sectorId }, { $set: payload }, { new: true })
      .chain('lean')
      .once();

    await SectorsHelper.update(sectorId, payload, credentials);

    SectorMock.verify();
  });

  it('should not update sector as name already exists', async () => {
    const payload = { name: 'Tutu' };
    const sectorId = new ObjectID();
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    SectorMock.expects('countDocuments').withExactArgs({ name: 'Tutu', company: companyId }).once().returns(3);
    SectorMock.expects('findOneAndUpdate').never();

    try {
      await SectorsHelper.update(sectorId, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      SectorMock.verify();
    }
  });
});

describe('remove', () => {
  it('should remove an sector', async () => {
    const sectorId = new ObjectID();
    const deleteOne = sinon.stub(Sector, 'deleteOne');

    await SectorsHelper.remove(sectorId);

    sinon.assert.calledWithExactly(deleteOne, { _id: sectorId });
  });
});
