const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const ThirdPartyPayersHelper = require('../../../src/helpers/thirdPartyPayers');

require('sinon-mongoose');

describe('create', () => {
  it('should create a nez thirdPartyPayer', async () => {
    const payload = {
      _id: new ObjectID(),
      name: 'Titi',
      address: {
        street: '42, avenue des Colibris',
        fullAddress: '42, avenue des Colibris 75020 Paris',
        zipCode: '75020',
        city: 'Paris',
        location: { type: 'Point', coordinates: [4.849302, 2.90887] },
      },
      isApa: false,
      billingMode: 'indirect',
    };
    const credentials = { company: { _id: new ObjectID() } };
    const payloadWithCompany = { ...payload, company: credentials.company._id };
    const newThirdPartyPayer = new ThirdPartyPayer(payloadWithCompany);
    const newThirdPartyPayerMock = sinon.mock(newThirdPartyPayer);
    const ThirdPartyPayerMock = sinon.mock(ThirdPartyPayer);

    ThirdPartyPayerMock.expects('create')
      .withExactArgs(payloadWithCompany)
      .once()
      .returns(newThirdPartyPayer);
    newThirdPartyPayerMock.expects('toObject').once().returns(payloadWithCompany);

    const result = await ThirdPartyPayersHelper.create(payload, credentials);

    expect(result).toMatchObject(payloadWithCompany);
    ThirdPartyPayerMock.verify();
    newThirdPartyPayerMock.verify();
  });
});

describe('list', () => {
  it('should list tpp', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const ThirdPartyPayerMock = sinon.mock(ThirdPartyPayer);

    ThirdPartyPayerMock.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('lean');

    await ThirdPartyPayersHelper.list(credentials);

    ThirdPartyPayerMock.verify();
  });
});

describe('update', () => {
  it('should update a tpp', async () => {
    const payload = { siret: '13605658901234' };
    const tppId = new ObjectID();
    const ThirdPartyPayerMock = sinon.mock(ThirdPartyPayer);

    ThirdPartyPayerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: tppId }, { $set: payload }, { new: true })
      .chain('lean')
      .once();

    await ThirdPartyPayersHelper.update(tppId, payload);

    ThirdPartyPayerMock.verify();
  });
});

describe('delete', () => {
  it('should remove an establishment', async () => {
    const tppId = new ObjectID();
    const deleteOne = sinon.stub(ThirdPartyPayer, 'deleteOne');

    await ThirdPartyPayersHelper.delete(tppId);

    sinon.assert.calledWithExactly(deleteOne, { _id: tppId });
  });
});
