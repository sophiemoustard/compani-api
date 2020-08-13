const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const expect = require('expect');
const flat = require('flat');
const crypto = require('crypto');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const Company = require('../../../src/models/Company');
const Rum = require('../../../src/models/Rum');
const Drive = require('../../../src/models/Google/Drive');
const CustomerHelper = require('../../../src/helpers/customers');
const ReferentHistoriesHelper = require('../../../src/helpers/referentHistories');
const FundingsHelper = require('../../../src/helpers/fundings');
const UtilsHelper = require('../../../src/helpers/utils');
const GdriveStorageHelper = require('../../../src/helpers/gdriveStorage');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const EventRepository = require('../../../src/repositories/EventRepository');
const CustomerRepository = require('../../../src/repositories/CustomerRepository');
const moment = require('moment');

require('sinon-mongoose');

describe('getCustomersBySector', () => {
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

    await CustomerHelper.getCustomersBySector(query, credentials);
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
    const companyId = new ObjectID();
    const RumMock = sinon.mock(Rum);

    RumMock
      .expects('findOneAndUpdate')
      .withExactArgs(
        { prefix: moment().format('YYMM'), company: companyId },
        {},
        { new: true, upsert: true, setDefaultsOnInsert: true }
      )
      .chain('lean');

    await CustomerHelper.getRumNumber(companyId);

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

describe('formatPaymentPayload', () => {
  let CustomerMock;
  let getRumNumber;
  let formatRumNumber;
  let updateOne;
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    getRumNumber = sinon.stub(CustomerHelper, 'getRumNumber');
    formatRumNumber = sinon.stub(CustomerHelper, 'formatRumNumber');
    updateOne = sinon.stub(Rum, 'updateOne');
  });
  afterEach(() => {
    CustomerMock.restore();
    getRumNumber.restore();
    formatRumNumber.restore();
    updateOne.restore();
  });

  it('should generate a new mandate', async () => {
    const company = { _id: new ObjectID(), prefixNumber: 101 };
    const rumNumber = { prefix: '1219', seq: 1 };
    const formattedRumNumber = 'R-1011219000010987654321';
    const customerId = new ObjectID();
    const customer = { payment: { bankAccountNumber: '', iban: 'FR4717569000303461796573B36', bic: '', mandates: [] } };
    const payload = { payment: { iban: 'FR8312739000501844178231W37' } };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);
    getRumNumber.returns(rumNumber);
    formatRumNumber.returns(formattedRumNumber);

    const result = await CustomerHelper.formatPaymentPayload(customerId, payload, company);

    expect(result).toEqual({
      $set: { 'payment.iban': 'FR8312739000501844178231W37' },
      $unset: { 'payment.bic': '' },
      $push: { 'payment.mandates': { rum: formattedRumNumber } },
    });
    CustomerMock.verify();
    sinon.assert.calledWithExactly(getRumNumber, company._id);
    sinon.assert.calledWithExactly(formatRumNumber, company.prefixNumber, rumNumber.prefix, 1);
    sinon.assert.calledWithExactly(updateOne, { prefix: rumNumber.prefix, company: company._id }, { $inc: { seq: 1 } });
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const company = { _id: new ObjectID(), prefixNumber: 101 };
    const customerId = new ObjectID();
    const customer = { payment: { bankAccountNumber: '', iban: '', bic: '', mandates: [] } };
    const payload = { payment: { iban: 'FR4717569000303461796573B36' } };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);

    const result = await CustomerHelper.formatPaymentPayload(customerId, payload, company);

    CustomerMock.verify();
    sinon.assert.notCalled(getRumNumber);
    sinon.assert.notCalled(formatRumNumber);
    sinon.assert.notCalled(updateOne);
    expect(result).toEqual({ $set: { 'payment.iban': 'FR4717569000303461796573B36' } });
  });
});

describe('updateCustomerEvents', () => {
  let updateMany;
  let CustomerMock;
  const customerId = new ObjectID();
  beforeEach(() => {
    updateMany = sinon.stub(Event, 'updateMany');
    CustomerMock = sinon.mock(Customer);
  });
  afterEach(() => {
    updateMany.restore();
    CustomerMock.restore();
  });

  it('should update events if primaryAddress is changed', async () => {
    const payload = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns({ contact: { primaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' } } });

    await CustomerHelper.updateCustomerEvents(customerId, payload);

    sinon.assert.calledWithExactly(
      updateMany,
      {
        customer: customerId,
        'address.fullAddress': '37 rue Ponthieu 75008 Paris',
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      { $set: { address: payload.contact.primaryAddress } }
    );
    CustomerMock.verify();
  });

  it('should update events if secondaryAddress is changed', async () => {
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns({ contact: { secondaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' } } });

    await CustomerHelper.updateCustomerEvents(customerId, payload);

    sinon.assert.calledWithExactly(
      updateMany,
      {
        customer: customerId,
        'address.fullAddress': '37 rue Ponthieu 75008 Paris',
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      { $set: { address: payload.contact.secondaryAddress } }
    );
    CustomerMock.verify();
  });

  it('shouldn\'t update events if secondaryAddress is created', async () => {
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns({ contact: { primaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' } } });

    await CustomerHelper.updateCustomerEvents(customerId, payload);

    CustomerMock.verify();
    sinon.assert.notCalled(updateMany);
  });

  it('should update events with primaryAddress if secondaryAddress is deleted', async () => {
    const payload = { contact: { secondaryAddress: { fullAddress: '' } } };
    const customer = {
      contact: {
        secondaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' },
        primaryAddress: { fullAddress: '46 rue Barrault 75013 Paris' },
      },
    };

    CustomerMock.expects('findById')
      .withExactArgs(customerId)
      .chain('lean')
      .once()
      .returns(customer);

    await CustomerHelper.updateCustomerEvents(customerId, payload);

    sinon.assert.calledWithExactly(
      updateMany,
      {
        customer: customerId,
        'address.fullAddress': '37 rue Ponthieu 75008 Paris',
        startDate: { $gte: moment().startOf('day').toDate() },
      },
      { $set: { address: customer.contact.primaryAddress } }
    );
    CustomerMock.verify();
  });
});

describe('updateCustomer', () => {
  let CustomerMock;
  let formatPaymentPayload;
  let updateCustomerEvents;
  let updateCustomerReferent;
  const credentials = { company: { _id: new ObjectID(), prefixNumber: 101 } };
  beforeEach(() => {
    CustomerMock = sinon.mock(Customer);
    formatPaymentPayload = sinon.stub(CustomerHelper, 'formatPaymentPayload');
    updateCustomerEvents = sinon.stub(CustomerHelper, 'updateCustomerEvents');
    updateCustomerReferent = sinon.stub(ReferentHistoriesHelper, 'updateCustomerReferent');
  });
  afterEach(() => {
    CustomerMock.restore();
    formatPaymentPayload.restore();
    updateCustomerEvents.restore();
    updateCustomerReferent.restore();
  });

  it('should unset the referent of a customer', async () => {
    const customer = { _id: new ObjectID(), referent: 'asdfghjkl' };
    const payload = { referent: '' };

    const customerResult = { _id: customer._id };

    CustomerMock.expects('findOne')
      .withExactArgs({ _id: customer._id })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customer._id, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.calledOnceWithExactly(updateCustomerReferent, customer._id, payload.referent, credentials.company);
    expect(result).toEqual(customerResult);
  });

  it('should generate a new mandate', async () => {
    const formattedRumNumber = 'R-1011219000010987654321';
    const customerId = new ObjectID();
    const payload = { payment: { iban: 'FR8312739000501844178231W37' } };
    const customerResult = {
      payment: { bankAccountNumber: '', iban: 'FR8312739000501844178231W37', bic: '', mandates: [formattedRumNumber] },
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

    formatPaymentPayload.returns({
      $set: flat(payload, { safe: true }),
      $push: { 'payment.mandates': { rum: formattedRumNumber } },
      $unset: { 'payment.bic': '' },
    });

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toEqual(customerResult);
    CustomerMock.verify();
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.calledOnceWithExactly(formatPaymentPayload, customerId, payload, credentials.company);
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const customerId = 'qwertyuiop';
    const payload = { payment: { iban: 'FR4717569000303461796573B36' } };
    const customerResult = {
      payment: { bankAccountNumber: '', iban: 'FR4717569000303461796573B36', bic: '', mandates: [] },
    };

    formatPaymentPayload.returns(payload);
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, payload, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(updateCustomerEvents);
    expect(result).toBe(customerResult);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.calledOnceWithExactly(formatPaymentPayload, customerId, payload, credentials.company);
  });

  it('should update events if primaryAddress is changed', async () => {
    const customerId = 'qwertyuiop';
    const payload = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };
    const customerResult = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    CustomerMock.verify();
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    expect(result).toBe(customerResult);
  });

  it('should update events if secondaryAddress is changed', async () => {
    const customerId = 'qwertyuiop';
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };
    const customerResult = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    CustomerMock.verify();
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    expect(result).toBe(customerResult);
  });

  it('shouldn\'t update events if secondaryAddress is created', async () => {
    const customerId = 'qwertyuiop';
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };
    const customerResult = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    expect(result).toBe(customerResult);
  });

  it('should update events with primaryAddress if secondaryAddress is deleted', async () => {
    const customerId = 'qwertyuiop';
    const payload = { contact: { secondaryAddress: { fullAddress: '' } } };
    const customerResult = {
      contact: {
        secondaryAddress: { fullAddress: '' },
        primaryAddress: { fullAddress: '46 rue Barrault 75013 Paris' },
      },
    };

    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    CustomerMock.verify();
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    expect(result).toBe(customerResult);
  });

  it('should update a customer', async () => {
    const customerId = 'qwertyuiop';
    const payload = { identity: { firstname: 'Raymond', lastname: 'Holt' } };

    const customerResult = { identity: { firstname: 'Raymond', lastname: 'Holt' } };
    CustomerMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true })
      .chain('lean')
      .once()
      .returns(customerResult);

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    CustomerMock.verify();
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
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
    sinon.assert.calledWithExactly(getRumNumberStub, credentials.company._id);
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
