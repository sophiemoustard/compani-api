const sinon = require('sinon');
const expect = require('expect');
const Customer = require('../../../models/Customer');
const Service = require('../../../models/Service');
const CustomerHelper = require('../../../helpers/customers');
const FundingsHelper = require('../../../helpers/fundings');
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
