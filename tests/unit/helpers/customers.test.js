const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const expect = require('expect');
const flat = require('flat');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const CustomerHelper = require('../../../src/helpers/customers');
const FundingsHelper = require('../../../src/helpers/fundings');
const EventsHelper = require('../../../src/helpers/events');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const EventRepository = require('../../../src/repositories/EventRepository');
const cloneDeep = require('lodash/cloneDeep');
const moment = require('moment');

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

    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    const queryBySector = { ...query, endDate, sector };
    await CustomerHelper.getCustomerBySector(queryBySector, credentials);
    sinon.assert.calledWith(getListQuery, { startDate, endDate, sector, type: 'intervention' });
    sinon.assert.calledWith(getCustomersFromEvent, { ...query, company: companyId });
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
    const companyId = new ObjectID();
    const query = { role: 'qwertyuiop', company: companyId };
    const credentials = { company: { _id: companyId } };
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const result = await CustomerHelper.getCustomers(query, credentials);

    CustomerMock.verify();
    expect(result).toEqual([]);
  });

  it('should return customers', async () => {
    const companyId = new ObjectID();
    const query = { role: 'qwertyuiop', company: companyId };
    const credentials = { company: { _id: companyId } };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId },
      { identity: { firstname: 'Brigitte' }, company: companyId },
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

    const result = await CustomerHelper.getCustomers(query, credentials);

    CustomerMock.verify();
    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true, company: companyId },
      { identity: { firstname: 'Brigitte' }, subscriptions: 2, subscriptionsAccepted: true, company: companyId },
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
    const companyId = new ObjectID();
    const query = { role: 'qwertyuiop', company: companyId };
    const credentials = { company: { _id: companyId } };
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const result = await CustomerHelper.getCustomersWithSubscriptions(query, credentials);

    CustomerMock.verify();
    expect(result).toEqual([]);
  });

  it('should return customers', async () => {
    const companyId = new ObjectID();
    const query = { role: 'qwertyuiop', company: companyId };
    const credentials = { company: { _id: companyId } };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId },
      { identity: { firstname: 'Brigitte' }, company: companyId },
    ];
    CustomerMock.expects('find')
      .withExactArgs(query)
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));

    const result = await CustomerHelper.getCustomersWithSubscriptions(query, credentials);

    CustomerMock.verify();
    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptions: 2, company: companyId },
      { identity: { firstname: 'Brigitte' }, subscriptions: 2, company: companyId },
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
    const companyId = new ObjectID();
    ServiceMock.expects('find').chain('lean').once().returns([]);
    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(credentials);

    CustomerMock.verify();
    ServiceMock.verify();
    expect(result).toEqual([]);
  });

  it('should return empty array if no customer', async () => {
    const companyId = new ObjectID();
    const services = [{ _id: '1234567890', nature: 'fixed', company: companyId }];
    const credentials = { company: { _id: companyId } };
    ServiceMock.expects('find').chain('lean').once().returns(services);
    CustomerMock.expects('find')
      .withExactArgs({ 'subscriptions.service': { $in: ['1234567890'] }, company: companyId })
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);
    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(credentials);

    CustomerMock.verify();
    ServiceMock.verify();
    expect(result).toEqual([]);
  });

  it('should return customers', async () => {
    const companyId = new ObjectID();
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId },
      { identity: { firstname: 'Brigitte' }, company: companyId },
    ];
    const services = [{ _id: '1234567890', nature: 'fixed' }];
    ServiceMock.expects('find').chain('lean').once().returns(services);
    CustomerMock.expects('find')
      .withExactArgs({ 'subscriptions.service': { $in: ['1234567890'] }, company: companyId })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));
    const credentials = { company: { _id: companyId } };

    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(credentials);

    CustomerMock.verify();
    ServiceMock.verify();
    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true, company: companyId },
      { identity: { firstname: 'Brigitte' }, subscriptions: 2, subscriptionsAccepted: true, company: companyId },
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
    const companyId = new ObjectID();

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('populate')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(null);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.getCustomer(customerId, credentials);

    CustomerMock.verify();
    expect(result).toBeNull();
  });

  it('should return customer', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = { company: companyId, identity: { firstname: 'Emmanuel' } };
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('populate')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.getCustomer(customerId, credentials);

    CustomerMock.verify();
    expect(result).toEqual({ identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true, company: companyId });
    sinon.assert.calledOnce(populateSubscriptionsServices);
    sinon.assert.calledOnce(subscriptionsAccepted);
  });

  it('should return customer', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = { company: companyId, identity: { firstname: 'Emmanuel' }, fundings: [{ _id: '1234' }, { _id: '09876' }] };
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('populate')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));
    populateFundings.returnsArg(0);

    const credentials = { company: { _id: companyId } };
    await CustomerHelper.getCustomer(customerId, credentials);

    CustomerMock.verify();
    sinon.assert.calledOnce(populateSubscriptionsServices);
    sinon.assert.calledOnce(subscriptionsAccepted);
    sinon.assert.calledTwice(populateFundings);
  });
});

describe('updateCustomer', () => {
  let CustomerMock;
  let generateRum;
  let updateMany;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    generateRum = sinon.stub(CustomerHelper, 'generateRum');
    updateMany = sinon.stub(Event, 'updateMany');
  });
  afterEach(() => {
    CustomerMock.restore();
    generateRum.restore();
    updateMany.restore();
  });

  it('should unset the referent of a customer', async () => {
    const companyId = new ObjectID();
    const customer = {
      _id: 'qwertyuiop',
      company: companyId,
      referent: 'asdfghjkl',
    };
    const payload = { referent: '' };

    const customerResult = {
      _id: 'qwertyuiop',
    };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customer._id, company: companyId }, { $unset: { referent: '' } }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };

    const result = await CustomerHelper.updateCustomer(customer._id, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    sinon.assert.notCalled(updateMany);
    expect(result).toBe(customerResult);
  });

  it('should generate a new mandate', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = {
      payment: {
        bankAccountNumber: '',
        iban: 'FR4717569000303461796573B36',
        bic: '',
        mandates: [],
      },
    };
    const payload = {
      payment: {
        iban: 'FR8312739000501844178231W37',
      },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    const mandate = '1234567890';
    generateRum.returns(mandate);
    const customerResult = {
      payment: {
        bankAccountNumber: '',
        iban: 'FR8312739000501844178231W37',
        bic: '',
        mandates: [mandate],
      },
    };
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId, company: companyId },
        {
          $set: flat(payload, { safe: true }),
          $push: { 'payment.mandates': { rum: mandate } },
          $unset: { 'payment.bic': '' },
        },
        { new: true }
      )
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.calledOnce(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t generate a new mandate (update bic)', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = {
      payment: {
        bankAccountNumber: '',
        iban: 'FR4717569000303461796573B36',
        bic: '',
        mandates: [],
      },
    };
    const payload = {
      payment: {
        iban: 'FR4717569000303461796573B36',
        bic: 'BNPAFRPPXXX',
      },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);

    const customerResult = {
      payment: {
        bankAccountNumber: '',
        iban: 'FR4717569000303461796573B36',
        bic: 'BNPAFRPPXXX',
        mandates: [],
      },
    };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t generate a new mandate (update name)', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = {
      payment: {
        bankAccountNumber: '',
        iban: 'FR4717569000303461796573B36',
        bic: '',
        mandates: [],
      },
    };
    const payload = {
      payment: {
        iban: 'FR4717569000303461796573B36',
        bankAccountOwner: 'Jake Peralta',
      },
    };
    const customerResult = {
      payment: {
        bankAccountNumber: 'Jake Peralta',
        iban: 'FR4717569000303461796573B36',
        bic: '',
        mandates: [],
      },
    };
    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = {
      payment: {
        bankAccountNumber: '',
        iban: '',
        bic: '',
        mandates: [],
      },
    };
    const payload = {
      payment: {
        iban: 'FR4717569000303461796573B36',
      },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.payment.iban = 'FR4717569000303461796573B36';
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('should update events if primaryAddress is changed', async () => {
    const customerId = 'qwertyuiop';
    const payload = {
      contact: {
        primaryAddress: {
          fullAddress: '27 rue des renaudes 75017 Paris',
        },
      },
    };
    const companyId = new ObjectID();
    const customer = {
      contact: {
        primaryAddress: {
          fullAddress: '37 rue Ponthieu 75008 Paris',
        },
      },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.primaryAddress.fullAddress = '27 rue des renaudes 75017 Paris';

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWith(
      updateMany,
      { 'address.fullAddress': customer.contact.primaryAddress.fullAddress, startDate: { $gte: moment().startOf('day').toDate() } },
      { $set: { address: payload.contact.primaryAddress } },
      { new: true }
    );
    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('should update events if secondaryAddress is changed', async () => {
    const customerId = 'qwertyuiop';
    const payload = {
      contact: {
        secondaryAddress: {
          fullAddress: '27 rue des renaudes 75017 Paris',
        },
      },
    };
    const customer = {
      contact: {
        secondaryAddress: {
          fullAddress: '37 rue Ponthieu 75008 Paris',
        },
      },
    };
    const companyId = new ObjectID();

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.secondaryAddress.fullAddress = '27 rue des renaudes 75017 Paris';

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWith(
      updateMany,
      { 'address.fullAddress': customer.contact.secondaryAddress.fullAddress, startDate: { $gte: moment().startOf('day').toDate() } },
      { $set: { address: payload.contact.secondaryAddress } },
      { new: true }
    );
    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t update events if secondaryAddress is created', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const payload = {
      contact: {
        secondaryAddress: {
          fullAddress: '27 rue des renaudes 75017 Paris',
        },
      },
    };
    const customer = {
      contact: {
        primaryAddress: {
          fullAddress: '37 rue Ponthieu 75008 Paris',
        },
      },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.secondaryAddress = { fullAddress: '27 rue des renaudes 75017 Paris' };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    sinon.assert.notCalled(updateMany);
    expect(result).toBe(customerResult);
  });

  it('should update events with primaryAddress if secondaryAddress is deleted', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const payload = {
      contact: {
        secondaryAddress: {
          fullAddress: '',
        },
      },
    };
    const customer = {
      contact: {
        secondaryAddress: {
          fullAddress: '37 rue Ponthieu 75008 Paris',
        },
        primaryAddress: {
          fullAddress: '46 rue Barrault 75013 Paris',
        },
      },
    };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customerId, company: companyId })
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.secondaryAddress = { fullAddress: '' };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWith(
      updateMany,
      { 'address.fullAddress': customer.contact.secondaryAddress.fullAddress, startDate: { $gte: moment().startOf('day').toDate() } },
      { $set: { address: customer.contact.primaryAddress } },
      { new: true }
    );
    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('should update a customer', async () => {
    const customerId = 'qwertyuiop';
    const companyId = new ObjectID();
    const customer = {
      identity: {
        firstname: 'Jake',
        lastname: 'Peralta',
      },
    };
    const payload = {
      identity: {
        firstname: 'Raymond',
        lastname: 'Holt',
      },
    };

    const customerResult = cloneDeep(customer);
    customerResult.identity.firstname = 'Raymond';
    customerResult.identity.lastname = 'Holt';
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId, company: companyId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });
});
