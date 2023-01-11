const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const Establishment = require('../../../src/models/Establishment');
const EstablishmentsHelper = require('../../../src/helpers/establishments');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Establishment, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create an establishment', async () => {
    const payload = {
      _id: new ObjectId(),
      name: 'Titi',
      siret: '13605658901234',
      address: {
        street: '42, avenue des Colibris',
        fullAddress: '42, avenue des Colibris 75020 Paris',
        zipCode: '75020',
        city: 'Paris',
        location: {
          type: 'Point',
          coordinates: [4.849302, 2.90887],
        },
      },
      phone: '0113956789',
      workHealthService: 'MT01',
      urssafCode: '117',
    };
    const credentials = { company: { _id: new ObjectId() } };
    const payloadWithCompany = { ...payload, company: credentials.company._id };

    create.returns(SinonMongoose.stubChainedQueries(payloadWithCompany, ['toObject']));

    const result = await EstablishmentsHelper.create(payload, credentials);

    expect(result).toMatchObject(payloadWithCompany);
    SinonMongoose.calledOnceWithExactly(
      create,
      [{ query: 'create', args: [payloadWithCompany] }, { query: 'toObject' }]
    );
  });
});

describe('update', () => {
  let findOneAndUpdate;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(Establishment, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
  });

  it('should update an establishment', async () => {
    const payload = { siret: '13605658901234' };
    const establishmentId = new ObjectId();

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries({ _id: establishmentId }, ['lean']));

    const result = await EstablishmentsHelper.update(establishmentId, payload);

    expect(result).toMatchObject({ _id: establishmentId });
    SinonMongoose.calledOnceWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: establishmentId }, { $set: payload }, { new: true }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Establishment, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should list establishments', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const establishments = [{ _id: new ObjectId() }, { _id: new ObjectId() }];

    find.returns(SinonMongoose.stubChainedQueries(establishments));

    await EstablishmentsHelper.list(credentials);

    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        { query: 'populate', args: [{ path: 'usersCount' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });
});

describe('remove', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(Establishment, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });

  it('should remove an establishment', async () => {
    const id = new ObjectId();

    await EstablishmentsHelper.remove(id);

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: id });
  });
});
