const sinon = require('sinon');
const expect = require('expect');
const Customer = require('../../../models/Customer');
const CustomerHelper = require('../../../helpers/customers');
const UtilsHelper = require('../../../helpers/utils');

require('sinon-mongoose');

describe('exportCustomers', () => {
  let CustomerModel;
  let getLastVersion;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    CustomerModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Titre', 'Nom', 'Prenom', 'Date de naissance', 'Adresse', 'Pathologie', 'Commentaire', 'Details intervention',
      'Autres', 'Référente', 'Nom associé au compte bancaire', 'IBAN', 'BIC', 'RUM', 'Date de signature du mandat', 'Nombre de souscriptions', 'Souscriptions',
      'Nombre de financements', 'Date de création']);
  });

  it('should return customer email', async () => {
    const customers = [
      { email: 'papi@mamie.pp' },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['papi@mamie.pp', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer identity', async () => {
    const customers = [
      { identity: { lastname: 'Papi', firstname: 'Grand Père', title: 'M', birthDate: '1919-12-12T00:00:00.000+00:00' } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'M', 'Papi', 'Grand Père', '12/12/1919', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return empty strings if customer identity missing', async () => {
    const customers = [
      { identity: { lastname: 'Papi', title: 'M' } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'M', 'Papi', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer address', async () => {
    const customers = [
      { contact: { address: { fullAddress: '9 rue du paradis 70015 Paris' } } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '9 rue du paradis 70015 Paris', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return empty strings if customer address missing', async () => {
    const customers = [
      { contact: { address: {} } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer followUp', async () => {
    const customers = [
      {
        followUp: {
          misc: 'Lala', details: 'Savate et charentaises', comments: 'Père Castor', pathology: 'Alzheimer', referent: 'Moi'
        },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', 'Alzheimer', 'Père Castor', 'Savate et charentaises', 'Lala', 'Moi',
      '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return empty strings if customer followUp missing', async () => {
    const customers = [
      {
        followUp: { misc: 'Lala', comments: 'Père Castor', referent: 'Moi' },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', 'Père Castor', '', 'Lala', 'Moi', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer payment', async () => {
    const customers = [
      {
        payment: {
          bankAccountOwner: 'Lui',
          iban: 'Boom Ba Da Boom',
          bic: 'bic bic',
          mandates: [{ rum: 'Grippe et rhume', signedAt: '2012-12-12T00:00:00.000+00:00' }]
        },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', 'Lui', 'Boom Ba Da Boom', 'bic bic', 'Grippe et rhume',
      '12/12/2012', 0, '', 0, '']);
  });

  it('should return empty strings if customer payment missing', async () => {
    const customers = [
      {
        payment: {
          bankAccountOwner: 'Lui',
          bic: 'bic bic',
          mandates: [{ rum: 'Grippe et rhume' }]
        },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', 'Lui', '', 'bic bic', 'Grippe et rhume', '', 0, '', 0, '']);
  });

  it('should return customer subscription count and service list name', async () => {
    const customers = [
      {
        subscriptions: [
          { service: { versions: [{ name: 'Au service de sa majesté' }] } },
          { service: { versions: [{ name: 'Service public' }] } },
          { service: { versions: [{ name: 'Service civique' }] } },
        ]
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 3,
      'Au service de sa majesté\r\n Service public\r\n Service civique', 0, '']);
  });

  it('should return customer funding count', async () => {
    const customers = [
      {
        fundings: [
          { _id: 'toto' },
          { _id: 'lala' },
        ]
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 2, '']);
  });

  it('should return customer creation date', async () => {
    const customers = [
      { createdAt: '2012-12-12T00:00:00.000+00:00' },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await CustomerHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '12/12/2012']);
  });
});
