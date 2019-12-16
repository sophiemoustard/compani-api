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
const UtilsHelper = require('../../../src/helpers/utils');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const EventRepository = require('../../../src/repositories/EventRepository');
const CustomerRepository = require('../../../src/repositories/CustomerRepository');
const cloneDeep = require('lodash/cloneDeep');
const moment = require('moment');
const { CUSTOMER_CONTRACT } = require('../../../src/helpers/constants');

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
    sinon.assert.calledWithExactly(getListQuery, { startDate, endDate, sector, type: 'intervention' }, credentials);
    sinon.assert.calledWithExactly(getCustomersFromEvent, query, companyId);
  });
});

describe('getCustomersWithBilledEvents', () => {
  let getCustomersWithBilledEvents;
  beforeEach(() => {
    getCustomersWithBilledEvents = sinon.stub(EventRepository, 'getCustomersWithBilledEvents');
  });
  afterEach(() => {
    getCustomersWithBilledEvents.restore();
  });

  it('should return customer by sector', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    await CustomerHelper.getCustomersWithBilledEvents(credentials);
    sinon.assert.calledWithExactly(
      getCustomersWithBilledEvents,
      { isBilled: true, type: 'intervention' }, credentials.company._id
    );
  });
});

describe('getCustomers', () => {
  let getCustomersList;
  let subscriptionsAccepted;
  let formatIdentity;
  beforeEach(() => {
    getCustomersList = sinon.stub(CustomerRepository, 'getCustomersList');
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    formatIdentity = sinon.stub(UtilsHelper, 'formatIdentity');
  });
  afterEach(() => {
    getCustomersList.restore();
    subscriptionsAccepted.restore();
    formatIdentity.restore();
  });

  it('should return empty array if no customer', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    getCustomersList.returns([]);
    const result = await CustomerHelper.getCustomers(credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(getCustomersList, companyId);
    sinon.assert.notCalled(subscriptionsAccepted);
    sinon.assert.notCalled(formatIdentity);
  });

  it('should return customers', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId },
      { company: companyId },
    ];
    getCustomersList.returns(customers);
    formatIdentity.callsFake(id => id.firstname);
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomers(credentials);

    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel', fullName: 'Emmanuel' }, subscriptionsAccepted: true, company: companyId },
      { subscriptionsAccepted: true, company: companyId },
    ]);
    sinon.assert.calledWithExactly(getCustomersList, companyId);
    sinon.assert.calledTwice(subscriptionsAccepted);
    sinon.assert.calledOnce(formatIdentity);
  });
});

describe('getCustomersFirstIntervention', () => {
  let CustomerMock;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    CustomerMock.restore();
  });

  it('should return customers with first intervention info', async () => {
    const customers = [
      { _id: '123456', firstIntervention: { _id: 'poiuy', startDate: '2019-09-10T00:00:00' } },
      { _id: '0987', firstIntervention: { _id: 'sdfg', startDate: '2019-09-10T00:00:00' } },
    ];

    const companyId = new ObjectID();
    const query = { company: companyId };
    CustomerMock
      .expects('find')
      .withExactArgs(query, { _id: 1 })
      .chain('populate')
      .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
      .chain('lean')
      .returns(customers)
      .once();

    const result = await CustomerHelper.getCustomersFirstIntervention(query, companyId);
    expect(result).toEqual({
      123456: { _id: '123456', firstIntervention: { _id: 'poiuy', startDate: '2019-09-10T00:00:00' } },
      '0987': { _id: '0987', firstIntervention: { _id: 'sdfg', startDate: '2019-09-10T00:00:00' } },
    });
    CustomerMock.verify();
  });
});

describe('getCustomersWithCustomerContractSubscriptions', () => {
  let ServiceMock;
  let subscriptionsAccepted;
  let getCustomersWithSubscriptions;
  beforeEach(() => {
    ServiceMock = sinon.mock(Service);
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    getCustomersWithSubscriptions = sinon.stub(CustomerRepository, 'getCustomersWithSubscriptions');
  });
  afterEach(() => {
    ServiceMock.restore();
    getCustomersWithSubscriptions.restore();
    subscriptionsAccepted.restore();
  });

  it('should return empty array if no service', async () => {
    const companyId = new ObjectID();
    ServiceMock
      .expects('find')
      .withExactArgs({ type: CUSTOMER_CONTRACT, company: companyId })
      .chain('lean')
      .once()
      .returns([]);
    const credentials = { company: { _id: companyId } };
    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(credentials);

    expect(result).toEqual([]);
    ServiceMock.verify();
  });

  it('should return empty array if no customer', async () => {
    const companyId = new ObjectID();
    const services = [{ _id: '1234567890', nature: 'fixed', company: companyId }];
    const credentials = { company: { _id: companyId } };
    ServiceMock
      .expects('find')
      .withExactArgs({ type: CUSTOMER_CONTRACT, company: companyId })
      .chain('lean')
      .once()
      .returns(services);
    getCustomersWithSubscriptions.returns([]);
    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(getCustomersWithSubscriptions, { 'subscriptions.service': { $in: ['1234567890'] } }, companyId);
    sinon.assert.notCalled(subscriptionsAccepted);
    ServiceMock.verify();
  });

  it('should return customers', async () => {
    const companyId = new ObjectID();
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId },
      { identity: { firstname: 'Brigitte' }, company: companyId },
    ];
    const services = [{ _id: '1234567890', nature: 'fixed' }];
    ServiceMock
      .expects('find')
      .withExactArgs({ type: CUSTOMER_CONTRACT, company: companyId })
      .chain('lean')
      .once()
      .returns(services);
    getCustomersWithSubscriptions.returns(customers);
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));
    const credentials = { company: { _id: companyId } };

    const result = await CustomerHelper.getCustomersWithCustomerContractSubscriptions(credentials);

    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptionsAccepted: true, company: companyId },
      { identity: { firstname: 'Brigitte' }, subscriptionsAccepted: true, company: companyId },
    ]);
    sinon.assert.calledWithExactly(getCustomersWithSubscriptions, { 'subscriptions.service': { $in: ['1234567890'] } }, companyId);
    sinon.assert.calledTwice(subscriptionsAccepted);
    ServiceMock.verify();
  });
});

describe('getCustomersWithIntervention', () => {
  let getCustomersWithInterventionStub;
  beforeEach(() => {
    getCustomersWithInterventionStub = sinon.stub(EventRepository, 'getCustomersWithIntervention');
  });
  afterEach(() => {
    getCustomersWithInterventionStub.restore();
  });

  it('should return an array of customers', async () => {
    const customer = { _id: new ObjectID(), identity: { firstname: 'toto', lastname: 'test' } }
    getCustomersWithInterventionStub.returns([customer]);
    const credentials = { company: { _id: new ObjectID() } };
    const result = await CustomerHelper.getCustomersWithIntervention(credentials);

    sinon.assert.calledOnce(getCustomersWithInterventionStub);
    sinon.assert.calledWithExactly(getCustomersWithInterventionStub, credentials.company._id);
    expect(result).toEqual([customer]);
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
    const customer = {
      _id: 'qwertyuiop',
      referent: 'asdfghjkl',
    };
    const payload = { referent: '' };

    const customerResult = {
      _id: 'qwertyuiop',
    };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customer._id }, { $unset: { referent: '' } }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customer._id, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    sinon.assert.notCalled(updateMany);
    expect(result).toBe(customerResult);
  });

  it('should generate a new mandate', async () => {
    const customerId = 'qwertyuiop';
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

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
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
        { _id: customerId },
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

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.calledOnce(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t generate a new mandate (update bic)', async () => {
    const customerId = 'qwertyuiop';
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

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
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
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t generate a new mandate (update name)', async () => {
    const customerId = 'qwertyuiop';
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
    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const customerId = 'qwertyuiop';
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

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.payment.iban = 'FR4717569000303461796573B36';
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

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
    const customer = {
      contact: {
        primaryAddress: {
          fullAddress: '37 rue Ponthieu 75008 Paris',
        },
      },
    };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.primaryAddress.fullAddress = '27 rue des renaudes 75017 Paris';

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    sinon.assert.calledWithExactly(
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

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.secondaryAddress.fullAddress = '27 rue des renaudes 75017 Paris';

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    sinon.assert.calledWithExactly(
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

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.secondaryAddress = { fullAddress: '27 rue des renaudes 75017 Paris' };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(generateRum);
    sinon.assert.notCalled(updateMany);
    expect(result).toBe(customerResult);
  });

  it('should update events with primaryAddress if secondaryAddress is deleted', async () => {
    const customerId = 'qwertyuiop';
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

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    const customerResult = cloneDeep(customer);
    customerResult.contact.secondaryAddress = { fullAddress: '' };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    sinon.assert.calledWithExactly(
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
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(generateRum);
    expect(result).toBe(customerResult);
  });
});
