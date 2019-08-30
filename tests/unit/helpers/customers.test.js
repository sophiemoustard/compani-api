const sinon = require('sinon');
const expect = require('expect');
const Customer = require('../../../models/Customer');
const Service = require('../../../models/Service');
const CustomerHelper = require('../../../helpers/customers');
const FundingsHelper = require('../../../helpers/fundings');
const UtilsHelper = require('../../../helpers/utils');
const EventsHelper = require('../../../helpers/events');
const SubscriptionsHelper = require('../../../helpers/subscriptions');
const EventRepository = require('../../../repositories/EventRepository');

require('sinon-mongoose');

describe('getCustomerBySector', () => {
  let getListQuery;
  let getCustomersFromEvent;
  beforeEach(() => {
    getListQuery = sinon.stub(EventsHelper, 'getListQuery');
    getCustomersFromEvent = sinon.stub(EventRepository, 'getCustomersFromEvent');
  });
  afterEach(() => {
    getListQuery.restore();
    getCustomersFromEvent.restore();
  });

  it('should return customer by sector', async () => {
    const startDate = '2019-04-14T09:00:00';
    const endDate = '2019-05-14T09:00:00';
    const sector = 'sector';
    const query = { startDate };
    getListQuery.returns(query);

    await CustomerHelper.getCustomerBySector(startDate, endDate, sector);
    sinon.assert.calledWith(getListQuery, { startDate, endDate, sector, type: 'intervention' });
    sinon.assert.calledWith(getCustomersFromEvent, query);
  });
});

describe('getCustomersWithBilledEvents', () => {
  let getCustomerWithBilledEvents;
  beforeEach(() => {
    getCustomerWithBilledEvents = sinon.stub(EventRepository, 'getCustomerWithBilledEvents');
  });
  afterEach(() => {
    getCustomerWithBilledEvents.restore();
  });

  it('should return customer by sector', async () => {
    await CustomerHelper.getCustomersWithBilledEvents();
    sinon.assert.calledWith(getCustomerWithBilledEvents, { isBilled: true, type: 'intervention' });
  });
});

describe('getCustomers', () => {
  let CustomerMock;
  let populateSubscriptionsServices;
  let subscriptionsAccepted;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
  });
  afterEach(() => {
    CustomerMock.restore();
    populateSubscriptionsServices.restore();
    subscriptionsAccepted.restore();
  });

  it('should return empty array if no customer', async () => {
    const query = { role: 'qwertyuiop' };
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const result = await CustomerHelper.getCustomers(query);

    CustomerMock.verify();
    expect(result).toEqual([]);
  });

  it('should return customers', async () => {
    const query = { role: 'qwertyuiop' };
    const customers = [
      { identity: { firstname: 'Emmanuel' } },
      { identity: { firstname: 'Brigitte' } },
    ];
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomers(query);

    CustomerMock.verify();
    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true },
      { identity: { firstname: 'Brigitte' }, subscriptions: 2, subscriptionsAccepted: true },
    ]);
    sinon.assert.calledTwice(populateSubscriptionsServices);
    sinon.assert.calledTwice(subscriptionsAccepted);
  });
});

describe('getCustomersWithSubscriptions', () => {
  let CustomerMock;
  let populateSubscriptionsServices;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    CustomerMock.restore();
    populateSubscriptionsServices.restore();
  });

  it('should return empty array if no customer', async () => {
    const query = { role: 'qwertyuiop' };
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const result = await CustomerHelper.getCustomersWithSubscriptions(query);

    CustomerMock.verify();
    expect(result).toEqual([]);
  });

  it('should return customers', async () => {
    const query = { role: 'qwertyuiop' };
    const customers = [
      { identity: { firstname: 'Emmanuel' } },
      { identity: { firstname: 'Brigitte' } },
    ];
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));

    const result = await CustomerHelper.getCustomersWithSubscriptions(query);

    CustomerMock.verify();
    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptions: 2 },
      { identity: { firstname: 'Brigitte' }, subscriptions: 2 },
    ]);
    sinon.assert.calledTwice(populateSubscriptionsServices);
  });
});

describe('getCustomersWithCustomerContractSubscriptions', () => {
  let CustomerMock;
  let ServiceMock;
  let populateSubscriptionsServices;
  let subscriptionsAccepted;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    ServiceMock = sinon.mock(Service);
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    CustomerMock.restore();
    ServiceMock.restore();
    populateSubscriptionsServices.restore();
    subscriptionsAccepted.restore();
  });

  it('should return empty array if no service', async () => {
    ServiceMock.expects('find').chain('lean').once().returns([]);
    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions();

    CustomerMock.verify();
    ServiceMock.verify();
    expect(result).toEqual([]);
  });

  it('should return empty array if no customer', async () => {
    const services = [{ _id: '1234567890', nature: 'fixed' }];
    ServiceMock.expects('find').chain('lean').once().returns(services);
    CustomerMock.expects('find')
      .withExactArgs({ 'subscriptions.service': { $in: ['1234567890'] } })
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions();

    CustomerMock.verify();
    ServiceMock.verify();
    expect(result).toEqual([]);
  });

  it('should return customers', async () => {
    const customers = [
      { identity: { firstname: 'Emmanuel' } },
      { identity: { firstname: 'Brigitte' } },
    ];
    const services = [{ _id: '1234567890', nature: 'fixed' }];
    ServiceMock.expects('find').chain('lean').once().returns(services);
    CustomerMock.expects('find')
      .withExactArgs({ 'subscriptions.service': { $in: ['1234567890'] } })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions();

    CustomerMock.verify();
    ServiceMock.verify();
    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true },
      { identity: { firstname: 'Brigitte' }, subscriptions: 2, subscriptionsAccepted: true },
    ]);
    sinon.assert.calledTwice(populateSubscriptionsServices);
    sinon.assert.calledTwice(subscriptionsAccepted);
  });
});

describe('getCustomer', () => {
  let CustomerMock;
  let populateSubscriptionsServices;
  let subscriptionsAccepted;
  let populateFundings;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    populateFundings = sinon.stub(FundingsHelper, 'populateFundings');
  });
  afterEach(() => {
    CustomerMock.restore();
    populateSubscriptionsServices.restore();
    subscriptionsAccepted.restore();
    populateFundings.restore();
  });

  it('should return null if no customer', async () => {
    const customerId = 'qwertyuiop';
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('populate')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(null);
    const result = await CustomerHelper.getCustomer(customerId);

    CustomerMock.verify();
    expect(result).toBeNull();
  });

  it('should return customer', async () => {
    const customerId = 'qwertyuiop';
    const customer = { identity: { firstname: 'Emmanuel' } };
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('populate')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomer(customerId);

    CustomerMock.verify();
    expect(result).toEqual({ identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true });
    sinon.assert.calledOnce(populateSubscriptionsServices);
    sinon.assert.calledOnce(subscriptionsAccepted);
  });

  it('should return customer', async () => {
    const customerId = 'qwertyuiop';
    const customer = { identity: { firstname: 'Emmanuel' }, fundings: [{ _id: '1234' }, { _id: '09876' }] };
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId })
      .chain('populate')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));
    populateFundings.returnsArg(0);

    await CustomerHelper.getCustomer(customerId);

    CustomerMock.verify();
    sinon.assert.calledOnce(populateSubscriptionsServices);
    sinon.assert.calledOnce(subscriptionsAccepted);
    sinon.assert.calledTwice(populateFundings);
  });
});

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
    expect(result[1]).toMatchObject(['', 'M', 'PAPI', 'Grand Père', '12/12/1919', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
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
    expect(result[1]).toMatchObject(['', 'M', 'PAPI', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
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
