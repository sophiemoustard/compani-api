const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const expect = require('expect');
const flat = require('flat');
const crypto = require('crypto');
const Customer = require('../../../src/models/Customer');
const Service = require('../../../src/models/Service');
const Event = require('../../../src/models/Event');
const Company = require('../../../src/models/Company');
const Rum = require('../../../src/models/Rum');
const Drive = require('../../../src/models/Google/Drive');
const CustomerHelper = require('../../../src/helpers/customers');
const FundingsHelper = require('../../../src/helpers/fundings');
const UtilsHelper = require('../../../src/helpers/utils');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const EventRepository = require('../../../src/repositories/EventRepository');
const CustomerRepository = require('../../../src/repositories/CustomerRepository');
const cloneDeep = require('lodash/cloneDeep');
const moment = require('moment');
const { CUSTOMER_CONTRACT } = require('../../../src/helpers/constants');

require('sinon-mongoose');

describe('getCustomerBySector', () => {
  let getCustomersFromEvent;
  beforeEach(() => {
    getCustomersFromEvent = sinon.stub(EventRepository, 'getCustomersFromEvent');
  });
  afterEach(() => {
    getCustomersFromEvent.restore();
  });

  it('should return customer by sector', async () => {
    const query = { startDate: '2019-04-14T09:00:00', endDate: '2019-05-14T09:00:00', sector: 'sector' };
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    await CustomerHelper.getCustomerBySector(query, credentials);
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
    const credentials = { company: { _id: companyId } };
    const query = { company: companyId };
    CustomerMock
      .expects('find')
      .withExactArgs(query, { _id: 1 })
      .chain('populate')
      .withExactArgs({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
      .chain('lean')
      .returns(customers)
      .once();

    const result = await CustomerHelper.getCustomersFirstIntervention(query, credentials);
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
    sinon.assert.calledWithExactly(
      getCustomersWithSubscriptions,
      { 'subscriptions.service': { $in: ['1234567890'] } },
      companyId
    );
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
    sinon.assert.calledWithExactly(
      getCustomersWithSubscriptions,
      { 'subscriptions.service': { $in: ['1234567890'] } },
      companyId
    );
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
    const customer = { _id: new ObjectID(), identity: { firstname: 'toto', lastname: 'test' } };
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
  let populateFundingsList;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    populateFundingsList = sinon.stub(FundingsHelper, 'populateFundingsList');
  });
  afterEach(() => {
    CustomerMock.restore();
    populateSubscriptionsServices.restore();
    subscriptionsAccepted.restore();
    populateFundingsList.restore();
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

  it('should return customer with fundings', async () => {
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
    populateFundingsList.returnsArg(0);

    await CustomerHelper.getCustomer(customerId);

    CustomerMock.verify();
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    sinon.assert.calledWithExactly(subscriptionsAccepted, { ...customer, subscriptions: 2 });
    sinon.assert.calledWithExactly(
      populateFundingsList,
      { ...customer, subscriptions: 2, subscriptionsAccepted: true }
    );
  });
});

describe('getRumNumber', () => {
  it('should get RUM number', async () => {
    const company = { _id: new ObjectID() };
    const RumMock = sinon.mock(Rum);

    RumMock
      .expects('findOneAndUpdate')
      .withExactArgs(
        { prefix: moment().format('YYMM'), company: company._id },
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .chain('lean');

    await CustomerHelper.getRumNumber(company);

    RumMock.verify();
    RumMock.restore();
  });
});

describe('formatRumNumber', () => {
  let randomBytesStub;

  beforeEach(() => {
    randomBytesStub = sinon.stub(crypto, 'randomBytes');
  });

  afterEach(() => {
    randomBytesStub.restore();
  });

  it('should format RUM number', () => {
    randomBytesStub.returns('0987654321');

    const result = CustomerHelper.formatRumNumber(101, '1219', 1);

    expect(result).toBe('R-1011219000010987654321');
  });

  it('should format RUM number with 5 digits', () => {
    randomBytesStub.returns('0987654321');

    const result = CustomerHelper.formatRumNumber(101, '1219', 92345);

    expect(result).toBe('R-1011219923450987654321');
  });
});

describe('updateCustomer', () => {
  let CustomerMock;
  let getRumNumberStub;
  let formatRumNumberStub;
  let updateMany;
  let updateOne;
  const credentials = { company: { _id: new ObjectID(), prefixNumber: 101 } };
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    getRumNumberStub = sinon.stub(CustomerHelper, 'getRumNumber');
    formatRumNumberStub = sinon.stub(CustomerHelper, 'formatRumNumber');
    updateMany = sinon.stub(Event, 'updateMany');
    updateOne = sinon.stub(Rum, 'updateOne');
  });
  afterEach(() => {
    CustomerMock.restore();
    getRumNumberStub.restore();
    formatRumNumberStub.restore();
    updateOne.restore();
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

    const result = await CustomerHelper.updateCustomer(customer._id, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
    sinon.assert.notCalled(updateMany);
    expect(result).toBe(customerResult);
  });

  it('should generate a new mandate', async () => {
    const rumNumber = { prefix: '1219', seq: 1 };
    const formattedRumNumber = 'R-1011219000010987654321';
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
    getRumNumberStub.returns(rumNumber);
    formatRumNumberStub.returns(formattedRumNumber);
    const customerResult = {
      payment: {
        bankAccountNumber: '',
        iban: 'FR8312739000501844178231W37',
        bic: '',
        mandates: [formattedRumNumber],
      },
    };
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs(
        { _id: customerId },
        {
          $set: flat(payload, { safe: true }),
          $push: { 'payment.mandates': { rum: formattedRumNumber } },
          $unset: { 'payment.bic': '' },
        },
        { new: true }
      )
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.calledWithExactly(getRumNumberStub, credentials.company);
    sinon.assert.calledWithExactly(
      formatRumNumberStub,
      credentials.company.prefixNumber,
      rumNumber.prefix,
      1
    );
    sinon.assert.calledWithExactly(
      updateOne,
      { prefix: rumNumber.prefix, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWithExactly(
      updateMany,
      {
        'address.fullAddress': customer.contact.primaryAddress.fullAddress,
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      { $set: { address: payload.contact.primaryAddress } },
      { new: true }
    );
    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWithExactly(
      updateMany,
      {
        'address.fullAddress': customer.contact.secondaryAddress.fullAddress,
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      { $set: { address: payload.contact.secondaryAddress } },
      { new: true }
    );
    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(updateOne);
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

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWithExactly(
      updateMany,
      {
        'address.fullAddress': customer.contact.secondaryAddress.fullAddress,
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      { $set: { address: customer.contact.primaryAddress } },
      { new: true }
    );
    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateOne);
    expect(result).toBe(customerResult);
  });

  it('should update a customer', async () => {
    const customerId = 'qwertyuiop';
    const customer = {
      identity: { firstname: 'Jake', lastname: 'Peralta' },
    };
    const payload = {
      identity: { firstname: 'Raymond', lastname: 'Holt' },
    };

    const customerResult = cloneDeep(customer);
    customerResult.identity.firstname = 'Raymond';
    customerResult.identity.lastname = 'Holt';
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumberStub);
    sinon.assert.notCalled(formatRumNumberStub);
    sinon.assert.notCalled(updateMany);
    sinon.assert.notCalled(updateOne);
    expect(result).toBe(customerResult);
  });
});

describe('createCustomer', () => {
  let getRumNumberStub;
  let formatRumNumberStub;
  let createFolder;
  let create;
  let updateOne;
  let CompanyMock;
  beforeEach(() => {
    getRumNumberStub = sinon.stub(CustomerHelper, 'getRumNumber');
    formatRumNumberStub = sinon.stub(CustomerHelper, 'formatRumNumber');
    createFolder = sinon.stub(GdriveStorageHelper, 'createFolder');
    create = sinon.stub(Customer, 'create');
    updateOne = sinon.stub(Rum, 'updateOne');
    CompanyMock = sinon.mock(Company);
  });
  afterEach(() => {
    getRumNumberStub.restore();
    formatRumNumberStub.restore();
    createFolder.restore();
    create.restore();
    updateOne.restore();
    CompanyMock.restore();
  });

  it('should create customer and drive folder', async () => {
    const rumNumber = { prefix: '1219', seq: 1 };
    const formattedRumNumber = 'R-1011219000010987654321';
    const credentials = { company: { _id: '0987654321', prefixNumber: 101, customersFolderId: '12345' } };
    const payload = { identity: { lastname: 'Bear', firstname: 'Teddy' } };
    getRumNumberStub.returns(rumNumber);
    formatRumNumberStub.returns(formattedRumNumber);
    createFolder.returns({ id: '1234567890', webViewLink: 'http://qwertyuiop' });
    create.returnsArg(0);

    const result = await CustomerHelper.createCustomer(payload, credentials);

    expect(result.identity.lastname).toEqual('Bear');
    expect(result.payment.mandates[0].rum).toEqual(formattedRumNumber);
    expect(result.driveFolder.link).toEqual('http://qwertyuiop');
    expect(result.driveFolder.driveId).toEqual('1234567890');
    sinon.assert.calledWithExactly(createFolder, { lastname: 'Bear', firstname: 'Teddy' }, '12345');
    sinon.assert.calledWithExactly(getRumNumberStub, credentials.company);
    sinon.assert.calledWithExactly(
      formatRumNumberStub,
      credentials.company.prefixNumber,
      rumNumber.prefix,
      1
    );
    sinon.assert.calledWithExactly(
      updateOne,
      { prefix: rumNumber.prefix, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
    CompanyMock.verify();
  });
});

describe('deleteCertificates', () => {
  let deleteFile;
  let updateOne;
  beforeEach(() => {
    deleteFile = sinon.stub(Drive, 'deleteFile');
    updateOne = sinon.stub(Customer, 'updateOne');
  });
  afterEach(() => {
    deleteFile.restore();
    updateOne.restore();
  });

  it('should delete file and update customer', async () => {
    const customerId = '1234567890';
    const driveId = 'qwertyuiop';
    await CustomerHelper.deleteCertificates(customerId, driveId);

    sinon.assert.calledWithExactly(deleteFile, { fileId: driveId });
    sinon.assert.calledWithExactly(updateOne, { _id: customerId }, { $pull: { financialCertificates: { driveId } } });
  });
});
