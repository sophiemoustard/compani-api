const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const Boom = require('boom');
const Establishment = require('../../../src/models/Establishment');
const EstablishmentsHelper = require('../../../src/helpers/establishments');

require('sinon-mongoose');

describe('create', () => {
  it('should create an establishment', async () => {
    const payload = {
      _id: new ObjectID(),
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
    const credentials = { company: { _id: new ObjectID() } };
    const payloadWithCompany = { ...payload, company: credentials.company._id };
    const newEstablishment = new Establishment(payloadWithCompany);
    const newEstablishmentMock = sinon.mock(newEstablishment);
    const EstablishmentMock = sinon.mock(Establishment);

    EstablishmentMock.expects('create')
      .withExactArgs(payloadWithCompany)
      .once()
      .returns(newEstablishment);
    newEstablishmentMock.expects('toObject').once().returns(payloadWithCompany);

    const result = await EstablishmentsHelper.create(payload, credentials);

    expect(result).toMatchObject(payloadWithCompany);
    EstablishmentMock.verify();
    newEstablishmentMock.verify();
  });
});

describe('update', () => {
  it('should update an establishment', async () => {
    const payload = { siret: '13605658901234' };
    const establishmentId = new ObjectID();
    const EstablishmentMock = sinon.mock(Establishment);

    EstablishmentMock
      .expects('findOneAndUpdate')
      .withExactArgs({ _id: establishmentId }, { $set: payload }, { new: true })
      .chain('lean')
      .once();

    await EstablishmentsHelper.update(establishmentId, payload);

    EstablishmentMock.verify();
  });
});

describe('list', () => {
  it('should list establishments', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const EstablishmentMock = sinon.mock(Establishment);

    EstablishmentMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .withExactArgs({ path: 'usersCount', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ virtuals: true });

    await EstablishmentsHelper.list(credentials);

    EstablishmentMock.verify();
  });
});

describe('remove', () => {
  const credentials = { company: { _id: new ObjectID() } };
  const establishmentId = new ObjectID();
  it('should remove an establishment', async () => {
    const establishment = new Establishment({ _id: establishmentId, name: 'Test', usersCount: 0 });
    const establishmentDocMock = sinon.mock(establishment);
    const EstablishmentMock = sinon.mock(Establishment);

    EstablishmentMock
      .expects('findById')
      .withExactArgs(establishmentId)
      .chain('populate')
      .withExactArgs({ path: 'usersCount', match: { company: credentials.company._id } })
      .once()
      .returns(establishment);

    establishmentDocMock
      .expects('remove')
      .once();

    await EstablishmentsHelper.remove(establishmentId, credentials);

    establishmentDocMock.verify();
    EstablishmentMock.verify();
  });

  it('should throw a 403 error if there are users attached to establishment', async () => {
    const establishment = new Establishment({ _id: establishmentId, name: 'Test', usersCount: 1 });
    const establishmentDocMock = sinon.mock(establishment);
    const EstablishmentMock = sinon.mock(Establishment);

    EstablishmentMock
      .expects('findById')
      .withExactArgs(establishmentId)
      .chain('populate')
      .withExactArgs({ path: 'usersCount', match: { company: credentials.company._id } })
      .once()
      .returns(establishment);

    establishmentDocMock
      .expects('remove')
      .never();

    try {
      await EstablishmentsHelper.remove(establishmentId, credentials);
      establishmentDocMock.verify();
      EstablishmentMock.verify();
    } catch (e) {
      establishmentDocMock.verify();
      EstablishmentMock.verify();
      expect(e).toEqual(Boom.forbidden());
    }
  });
});
