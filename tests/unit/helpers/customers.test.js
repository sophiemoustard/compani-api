const { ObjectID } = require('mongodb');
const sinon = require('sinon');
const expect = require('expect');
const flat = require('flat');
const crypto = require('crypto');
const moment = require('moment');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const Rum = require('../../../src/models/Rum');
const Drive = require('../../../src/models/Google/Drive');
const Helper = require('../../../src/models/Helper');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const EventHistory = require('../../../src/models/EventHistory');
const Repetition = require('../../../src/models/Repetition');
const CustomerPartner = require('../../../src/models/CustomerPartner');
const User = require('../../../src/models/User');
const CustomerHelper = require('../../../src/helpers/customers');
const ReferentHistoriesHelper = require('../../../src/helpers/referentHistories');
const FundingsHelper = require('../../../src/helpers/fundings');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const EventsHelper = require('../../../src/helpers/events');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EventRepository = require('../../../src/repositories/EventRepository');
const SinonMongoose = require('../sinonMongoose');

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
  let findCustomer;
  let subscriptionsAccepted;
  let populateSubscriptionsServices;
  beforeEach(() => {
    findCustomer = sinon.stub(Customer, 'find');
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    findCustomer.restore();
    subscriptionsAccepted.restore();
    populateSubscriptionsServices.restore();
  });

  it('should return empty array if no customer', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };

    findCustomer.returns(SinonMongoose.stubChainedQueries([[]]));

    const result = await CustomerHelper.getCustomers(credentials);

    expect(result).toEqual([]);
    sinon.assert.notCalled(subscriptionsAccepted);
    sinon.assert.notCalled(populateSubscriptionsServices);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return customers', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId },
      { company: companyId },
    ];

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));
    populateSubscriptionsServices.returnsArg(0);
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomers(credentials);

    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptionsAccepted: true, company: companyId },
      { subscriptionsAccepted: true, company: companyId },
    ]);
    sinon.assert.calledTwice(subscriptionsAccepted);
    sinon.assert.calledTwice(populateSubscriptionsServices);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('getCustomersFirstIntervention', () => {
  let findCustomer;
  beforeEach(() => {
    findCustomer = sinon.stub(Customer, 'find');
  });
  afterEach(() => {
    findCustomer.restore();
  });

  it('should return customers with first intervention info', async () => {
    const customers = [
      { _id: '123456', firstIntervention: { _id: 'poiuy', startDate: '2019-09-10T00:00:00' } },
      { _id: '0987', firstIntervention: { _id: 'sdfg', startDate: '2019-09-10T00:00:00' } },
    ];

    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const query = { company: companyId };

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));

    const result = await CustomerHelper.getCustomersFirstIntervention(query, credentials);

    expect(result).toEqual({
      123456: { _id: '123456', firstIntervention: { _id: 'poiuy', startDate: '2019-09-10T00:00:00' } },
      '0987': { _id: '0987', firstIntervention: { _id: 'sdfg', startDate: '2019-09-10T00:00:00' } },
    });
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [query, { _id: 1 }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: companyId } }],
        },
        { query: 'lean' },
      ]
    );
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

    expect(result).toEqual([customer]);
    sinon.assert.calledOnce(getCustomersWithInterventionStub);
    sinon.assert.calledWithExactly(getCustomersWithInterventionStub, credentials.company._id);
  });
});

describe('getCustomer', () => {
  let findOneCustomer;
  let populateSubscriptionsServices;
  let subscriptionsAccepted;
  let populateFundingsList;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
    subscriptionsAccepted = sinon.stub(SubscriptionsHelper, 'subscriptionsAccepted');
    populateFundingsList = sinon.stub(FundingsHelper, 'populateFundingsList');
  });
  afterEach(() => {
    findOneCustomer.restore();
    populateSubscriptionsServices.restore();
    subscriptionsAccepted.restore();
    populateFundingsList.restore();
  });

  it('should return null if no customer', async () => {
    const customerId = 'qwertyuiop';
    const credentials = { company: { _id: new ObjectID() } };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([null]));

    const result = await CustomerHelper.getCustomer(customerId, credentials);

    expect(result).toBeNull();
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [
        { query: 'findOne', args: [{ _id: customerId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } }] },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer' }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } }],
        },
        { query: 'populate', args: [{ path: 'referent', match: { company: credentials.company._id } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should return customer', async () => {
    const customerId = 'qwertyuiop';
    const credentials = { company: { _id: new ObjectID() } };
    const customer = { identity: { firstname: 'Emmanuel' } };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([customer]));
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomer(customerId, credentials);

    expect(result).toEqual({ identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true });
    sinon.assert.calledOnce(populateSubscriptionsServices);
    sinon.assert.calledOnce(subscriptionsAccepted);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [
        { query: 'findOne', args: [{ _id: customerId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } }] },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer' }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } }],
        },
        { query: 'populate', args: [{ path: 'referent', match: { company: credentials.company._id } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should return customer with fundings', async () => {
    const customerId = 'qwertyuiop';
    const credentials = { company: { _id: new ObjectID() } };
    const customer = { identity: { firstname: 'Emmanuel' }, fundings: [{ _id: '1234' }, { _id: '09876' }] };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([customer]));
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));
    populateFundingsList.returnsArg(0);

    const result = await CustomerHelper.getCustomer(customerId, credentials);

    expect(result).toEqual(
      {
        identity: { firstname: 'Emmanuel' },
        fundings: [{ _id: '1234' }, { _id: '09876' }],
        subscriptions: 2,
        subscriptionsAccepted: true,
      }
    );
    sinon.assert.calledWithExactly(populateSubscriptionsServices, customer);
    sinon.assert.calledWithExactly(subscriptionsAccepted, { ...customer, subscriptions: 2 });
    sinon.assert.calledWithExactly(
      populateFundingsList,
      { ...customer, subscriptions: 2, subscriptionsAccepted: true }
    );
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [
        { query: 'findOne', args: [{ _id: customerId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge' } }] },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer' }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } }],
        },
        { query: 'populate', args: [{ path: 'referent', match: { company: credentials.company._id } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });
});

describe('getRumNumber', () => {
  let findOneAndUpdateRum;
  beforeEach(() => {
    findOneAndUpdateRum = sinon.stub(Rum, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdateRum.restore();
  });
  it('should get RUM number', async () => {
    const companyId = new ObjectID();

    findOneAndUpdateRum.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    await CustomerHelper.getRumNumber(companyId);

    SinonMongoose.calledWithExactly(
      findOneAndUpdateRum,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { prefix: moment().format('YYMM'), company: companyId },
            {},
            { new: true, upsert: true, setDefaultsOnInsert: true },
          ],
        },
      ]
    );
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
  let findByIdCustomer;
  let getRumNumber;
  let formatRumNumber;
  let updateOne;
  beforeEach(() => {
    findByIdCustomer = sinon.stub(Customer, 'findById');
    getRumNumber = sinon.stub(CustomerHelper, 'getRumNumber');
    formatRumNumber = sinon.stub(CustomerHelper, 'formatRumNumber');
    updateOne = sinon.stub(Rum, 'updateOne');
  });
  afterEach(() => {
    findByIdCustomer.restore();
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

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));
    getRumNumber.returns(rumNumber);
    formatRumNumber.returns(formattedRumNumber);

    const result = await CustomerHelper.formatPaymentPayload(customerId, payload, company);

    expect(result).toEqual({
      $set: { 'payment.iban': 'FR8312739000501844178231W37' },
      $unset: { 'payment.bic': '' },
      $push: { 'payment.mandates': { rum: formattedRumNumber } },
    });
    sinon.assert.calledWithExactly(getRumNumber, company._id);
    sinon.assert.calledWithExactly(formatRumNumber, company.prefixNumber, rumNumber.prefix, 1);
    sinon.assert.calledWithExactly(updateOne, { prefix: rumNumber.prefix, company: company._id }, { $inc: { seq: 1 } });
    SinonMongoose.calledWithExactly(findByIdCustomer, [{ query: 'finById', args: [customerId] }, { query: 'lean' }]);
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const company = { _id: new ObjectID(), prefixNumber: 101 };
    const customerId = new ObjectID();
    const customer = { payment: { bankAccountNumber: '', iban: '', bic: '', mandates: [] } };
    const payload = { payment: { iban: 'FR4717569000303461796573B36' } };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));

    const result = await CustomerHelper.formatPaymentPayload(customerId, payload, company);

    expect(result).toEqual({ $set: { 'payment.iban': 'FR4717569000303461796573B36' } });
    sinon.assert.notCalled(getRumNumber);
    sinon.assert.notCalled(formatRumNumber);
    sinon.assert.notCalled(updateOne);
    SinonMongoose.calledWithExactly(findByIdCustomer, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
  });
});

describe('updateCustomerEvents', () => {
  let updateMany;
  let findByIdCustomer;
  const customerId = new ObjectID();
  beforeEach(() => {
    updateMany = sinon.stub(Event, 'updateMany');
    findByIdCustomer = sinon.stub(Customer, 'findById');
  });
  afterEach(() => {
    updateMany.restore();
    findByIdCustomer.restore();
  });

  it('should update events if primaryAddress is changed', async () => {
    const payload = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries(
      [{ contact: { primaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' } } }],
      ['lean']
    ));

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
    SinonMongoose.calledWithExactly(findByIdCustomer, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
  });

  it('should update events if secondaryAddress is changed', async () => {
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries(
      [{ contact: { secondaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' } } }],
      ['lean']
    ));

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
    SinonMongoose.calledWithExactly(findByIdCustomer, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
  });

  it('shouldn\'t update events if secondaryAddress is created', async () => {
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries(
      [{ contact: { primaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' } } }],
      ['lean']
    ));

    await CustomerHelper.updateCustomerEvents(customerId, payload);

    sinon.assert.notCalled(updateMany);
    SinonMongoose.calledWithExactly(findByIdCustomer, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
  });

  it('should update events with primaryAddress if secondaryAddress is deleted', async () => {
    const payload = { contact: { secondaryAddress: { fullAddress: '' } } };
    const customer = {
      contact: {
        secondaryAddress: { fullAddress: '37 rue Ponthieu 75008 Paris' },
        primaryAddress: { fullAddress: '46 rue Barrault 75013 Paris' },
      },
    };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));

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
    SinonMongoose.calledWithExactly(findByIdCustomer, [{ query: 'findById', args: [customerId] }, { query: 'lean' }]);
  });
});

describe('updateCustomer', () => {
  let findOneCustomer;
  let findOneAndUpdateCustomer;
  let formatPaymentPayload;
  let updateCustomerEvents;
  let updateCustomerReferent;
  let deleteListEvent;
  let countDocumentsEventHistory;
  let findRepetition;
  let findOneUser;
  let createRepetitionsEveryDay;
  let nowStub;
  let deleteOneRepetition;
  const credentials = { company: { _id: new ObjectID(), prefixNumber: 101 } };
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
    findOneAndUpdateCustomer = sinon.stub(Customer, 'findOneAndUpdate');
    formatPaymentPayload = sinon.stub(CustomerHelper, 'formatPaymentPayload');
    updateCustomerEvents = sinon.stub(CustomerHelper, 'updateCustomerEvents');
    updateCustomerReferent = sinon.stub(ReferentHistoriesHelper, 'updateCustomerReferent');
    deleteListEvent = sinon.stub(EventsHelper, 'deleteCustomerEvents');
    countDocumentsEventHistory = sinon.stub(EventHistory, 'countDocuments');
    findRepetition = sinon.stub(Repetition, 'find');
    findOneUser = sinon.stub(User, 'findOne');
    createRepetitionsEveryDay = sinon.stub(EventsRepetitionHelper, 'createRepetitionsEveryDay');
    nowStub = sinon.stub(Date, 'now');
    deleteOneRepetition = sinon.stub(Repetition, 'deleteOne');
  });
  afterEach(() => {
    findOneCustomer.restore();
    findOneAndUpdateCustomer.restore();
    formatPaymentPayload.restore();
    updateCustomerEvents.restore();
    updateCustomerReferent.restore();
    deleteListEvent.restore();
    countDocumentsEventHistory.restore();
    findRepetition.restore();
    findOneUser.restore();
    createRepetitionsEveryDay.restore();
    nowStub.restore();
    deleteOneRepetition.restore();
  });

  it('should unset the referent of a customer', async () => {
    const customer = { _id: new ObjectID(), referent: 'asdfghjkl' };
    const payload = { referent: '' };

    const customerResult = { _id: customer._id };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customer._id, payload, credentials);

    expect(result).toEqual(customerResult);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(findOneAndUpdateCustomer);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    sinon.assert.calledOnceWithExactly(updateCustomerReferent, customer._id, payload.referent, credentials.company);
    SinonMongoose.calledWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customer._id }] }, { query: 'lean' }]
    );
  });

  it('should generate a new mandate', async () => {
    const formattedRumNumber = 'R-1011219000010987654321';
    const customerId = new ObjectID();
    const payload = { payment: { iban: 'FR8312739000501844178231W37' } };
    const customerResult = {
      payment: { bankAccountNumber: '', iban: 'FR8312739000501844178231W37', bic: '', mandates: [formattedRumNumber] },
    };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    formatPaymentPayload.returns({
      $set: flat(payload, { safe: true }),
      $push: { 'payment.mandates': { rum: formattedRumNumber } },
      $unset: { 'payment.bic': '' },
    });

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toEqual(customerResult);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(findOneCustomer);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    sinon.assert.calledOnceWithExactly(formatPaymentPayload, customerId, payload, credentials.company);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [
            { _id: customerId },
            {
              $set: flat(payload, { safe: true }),
              $push: { 'payment.mandates': { rum: formattedRumNumber } },
              $unset: { 'payment.bic': '' },
            },
            { new: true },
          ],
        },
        { query: 'lean' },
      ]
    );
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const customerId = new ObjectID();
    const payload = { payment: { iban: 'FR4717569000303461796573B36' } };
    const customerResult = {
      payment: { bankAccountNumber: '', iban: 'FR4717569000303461796573B36', bic: '', mandates: [] },
    };

    formatPaymentPayload.returns(payload);

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(findOneCustomer);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    sinon.assert.calledOnceWithExactly(formatPaymentPayload, customerId, payload, credentials.company);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [{ query: 'findOneAndUpdate', args: [{ _id: customerId }, payload, { new: true }] }, { query: 'lean' }]
    );
  });

  it('should update events if primaryAddress is changed', async () => {
    const customerId = new ObjectID();
    const payload = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };
    const customerResult = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should update events if secondaryAddress is changed', async () => {
    const customerId = new ObjectID();
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };
    const customerResult = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('shouldn\'t update events if secondaryAddress is created', async () => {
    const customerId = new ObjectID();
    const payload = { contact: { secondaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };
    const customerResult = { contact: { primaryAddress: { fullAddress: '27 rue des renaudes 75017 Paris' } } };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should update events with primaryAddress if secondaryAddress is deleted', async () => {
    const customerId = new ObjectID();
    const payload = { contact: { secondaryAddress: { fullAddress: '' } } };
    const customerResult = {
      contact: {
        secondaryAddress: { fullAddress: '' },
        primaryAddress: { fullAddress: '46 rue Barrault 75013 Paris' },
      },
    };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.calledWithExactly(updateCustomerEvents, customerId, payload);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should deleted customer\'s events + repetition but not create events when customer is stopped'
    + 'but last event created by repetition is after stopping date', async () => {
    const customerId = new ObjectID();
    const repetitions = [{
      type: 'intervention',
      customer: customerId,
      frequency: 'every_day',
      parentId: new ObjectID(),
      startDate: '2021-07-01T09:00:00Z',
      endDate: '2021-07-01T10:00:00Z',
    }];
    const customerResult = { identity: { firstname: 'Molly', lastname: 'LeGrosChat' } };
    const payload = { stoppedAt: '2019-06-25T16:34:04.144Z', stopReason: 'hospitalization' };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));
    countDocumentsEventHistory.returns(0);
    findRepetition.returns(SinonMongoose.stubChainedQueries([repetitions], ['lean']));
    nowStub.returns('2021-06-25T16:34:04.144Z');

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.calledOnceWithExactly(deleteListEvent, customerId, '2019-06-25T16:34:04.144Z', null, credentials);
    sinon.assert.notCalled(findOneUser);
    sinon.assert.calledOnceWithExactly(deleteOneRepetition, { _id: repetitions[0]._id });
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
  });

  it('should deleted customer\'s events + repetition and create events when customer is stopped'
    + 'and last event created by repetition is before stopping date', async () => {
    const auxiliaryId = new ObjectID();
    const customerId = new ObjectID();
    const repetitions = [
      {
        _id: new ObjectID(),
        type: 'intervention',
        customer: customerId,
        frequency: 'every_day',
        parentId: new ObjectID(),
        startDate: '2019-12-01T09:00:00Z',
        endDate: '2019-12-01T10:00:00Z',
        auxiliary: auxiliaryId,
      },
      {
        _id: new ObjectID(),
        type: 'intervention',
        customer: customerId,
        frequency: 'every_day',
        parentId: new ObjectID(),
        startDate: '2021-12-25T09:00:00Z',
        endDate: '2021-12-25T10:00:00Z',
        sector: new ObjectID(),
      },
    ];
    const customerResult = { identity: { firstname: 'Molly', lastname: 'LeGrosChat' } };
    const payload = { stoppedAt: '2022-06-25T16:34:04.144Z', stopReason: 'hospitalization' };
    const auxiliary = { sector: new ObjectID() };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['populate', 'lean']));
    countDocumentsEventHistory.returns(0);
    findRepetition.returns(SinonMongoose.stubChainedQueries([repetitions], ['lean']));
    findOneUser.returns(SinonMongoose.stubChainedQueries([auxiliary], ['populate', 'lean']));
    nowStub.returns('2021-06-25T16:34:04.144Z');

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.calledOnceWithExactly(deleteListEvent, customerId, '2022-06-25T16:34:04.144Z', null, credentials);
    SinonMongoose.calledWithExactly(
      findOneUser,
      [
        { query: 'findOneUser', args: [{ _id: auxiliaryId }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
    sinon.assert.calledWithExactly(
      createRepetitionsEveryDay.getCall(0),
      repetitions[0],
      auxiliary.sector,
      new Date('2021-09-24T16:34:04.144Z'),
      '2022-06-25T16:34:04.144Z'
    );
    sinon.assert.calledWithExactly(
      createRepetitionsEveryDay.getCall(1),
      repetitions[1],
      repetitions[1].sector,
      new Date('2022-03-26T09:00:00.000Z'),
      '2022-06-25T16:34:04.144Z'
    );
    sinon.assert.calledWithExactly(deleteOneRepetition.getCall(0), { _id: repetitions[0]._id });
    sinon.assert.calledWithExactly(deleteOneRepetition.getCall(1), { _id: repetitions[1]._id });
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
  });

  it('should not delete events on stop if some are timeStamped', async () => {
    try {
      const customerId = new ObjectID();
      const payload = { stoppedAt: '2021-06-25T16:34:04.144Z', stopReason: 'hospitalization' };
      const customerResult = { identity: { firstname: 'Molly', lastname: 'LeGrosChat' } };

      countDocumentsEventHistory.returns(1);
      findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

      await CustomerHelper.updateCustomer(customerId, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.notCalled(deleteListEvent);
      sinon.assert.notCalled(findOneUser);
      sinon.assert.notCalled(findOneAndUpdateCustomer);
      sinon.assert.notCalled(formatPaymentPayload);
      sinon.assert.notCalled(updateCustomerEvents);
      sinon.assert.notCalled(updateCustomerReferent);
    }
  });

  it('should update a customer', async () => {
    const customerId = new ObjectID();
    const payload = { identity: { firstname: 'Raymond', lastname: 'Holt' } };
    const customerResult = { identity: { firstname: 'Raymond', lastname: 'Holt' } };

    findOneAndUpdateCustomer.returns(SinonMongoose.stubChainedQueries([customerResult], ['lean']));

    const result = await CustomerHelper.updateCustomer(customerId, payload, credentials);

    expect(result).toBe(customerResult);
    sinon.assert.notCalled(formatPaymentPayload);
    sinon.assert.notCalled(updateCustomerEvents);
    sinon.assert.notCalled(updateCustomerReferent);
    sinon.assert.notCalled(deleteListEvent);
    sinon.assert.notCalled(findOneUser);
    SinonMongoose.calledWithExactly(
      findOneAndUpdateCustomer,
      [
        {
          query: 'findOneAndUpdate',
          args: [{ _id: customerId }, { $set: flat(payload, { safe: true }) }, { new: true }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('createCustomer', () => {
  let getRumNumberStub;
  let formatRumNumberStub;
  let createFolder;
  let create;
  let updateOne;
  beforeEach(() => {
    getRumNumberStub = sinon.stub(CustomerHelper, 'getRumNumber');
    formatRumNumberStub = sinon.stub(CustomerHelper, 'formatRumNumber');
    createFolder = sinon.stub(GDriveStorageHelper, 'createFolder');
    create = sinon.stub(Customer, 'create');
    updateOne = sinon.stub(Rum, 'updateOne');
  });
  afterEach(() => {
    getRumNumberStub.restore();
    formatRumNumberStub.restore();
    createFolder.restore();
    create.restore();
    updateOne.restore();
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
    sinon.assert.calledWithExactly(formatRumNumberStub, credentials.company.prefixNumber, rumNumber.prefix, 1);
    sinon.assert.calledWithExactly(
      updateOne,
      { prefix: rumNumber.prefix, company: credentials.company._id },
      { $set: { seq: 2 } }
    );
  });
});

describe('removeCustomer', () => {
  let findOne;
  let findHelper;
  let deleteOne;
  let deleteManyHelper;
  let deleteManyReferentHistory;
  let deleteManyEventHistory;
  let deleteManyRepetition;
  let deleteManyCustomerPartner;
  let updateOneUser;
  let deleteFileDrive;
  beforeEach(() => {
    findOne = sinon.stub(Customer, 'findOne');
    findHelper = sinon.stub(Helper, 'find');
    deleteOne = sinon.stub(Customer, 'deleteOne');
    deleteManyHelper = sinon.stub(Helper, 'deleteMany');
    deleteManyReferentHistory = sinon.stub(ReferentHistory, 'deleteMany');
    deleteManyEventHistory = sinon.stub(EventHistory, 'deleteMany');
    deleteManyRepetition = sinon.stub(Repetition, 'deleteMany');
    deleteManyCustomerPartner = sinon.stub(CustomerPartner, 'deleteMany');
    updateOneUser = sinon.stub(User, 'updateOne');
    deleteFileDrive = sinon.stub(Drive, 'deleteFile');
  });
  afterEach(() => {
    findOne.restore();
    findHelper.restore();
    deleteOne.restore();
    deleteManyHelper.restore();
    deleteManyReferentHistory.restore();
    deleteManyEventHistory.restore();
    deleteManyRepetition.restore();
    deleteManyCustomerPartner.restore();
    updateOneUser.restore();
    updateOneUser.restore();
    deleteFileDrive.restore();
  });

  it('should delete customer and his drive folder', async () => {
    const companyId = new ObjectID();
    const customerId = new ObjectID();
    const customer = { _id: customerId, driveFolder: { driveId: 'https://skusku.com' }, company: companyId };
    const helper1Id = new ObjectID();
    const helper2Id = new ObjectID();
    const helpers = [
      { customer: customerId, user: helper1Id, company: companyId },
      { customer: customerId, user: helper2Id, company: companyId },
    ];

    findOne.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));
    findHelper.returns(SinonMongoose.stubChainedQueries([helpers], ['lean']));

    await CustomerHelper.removeCustomer(customerId);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: customerId }, { driveFolder: 1, company: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      findHelper,
      [{ query: 'find', args: [{ customer: customerId, company: companyId }, { user: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyHelper, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyReferentHistory, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyEventHistory, { 'event.customer': customerId });
    sinon.assert.calledOnceWithExactly(deleteManyRepetition, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyCustomerPartner, { customer: customerId });
    sinon.assert.calledWithExactly(
      updateOneUser.getCall(0),
      { _id: helper1Id },
      { $unset: { 'role.client': '', company: '' } }
    );
    sinon.assert.calledWithExactly(
      updateOneUser.getCall(1),
      { _id: helper2Id },
      { $unset: { 'role.client': '', company: '' } }
    );
    sinon.assert.calledTwice(updateOneUser);
    sinon.assert.calledOnceWithExactly(deleteFileDrive, { fileId: customer.driveFolder.driveId });
  });

  it('should delete customer but not his drive folder', async () => {
    const companyId = new ObjectID();
    const customerId = new ObjectID();
    const customer = { _id: customerId, company: companyId };
    const helperId = new ObjectID();
    const helper = { customer: customerId, user: helperId, company: companyId };

    findOne.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));
    findHelper.returns(SinonMongoose.stubChainedQueries([[helper]], ['lean']));

    await CustomerHelper.removeCustomer(customerId);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: customerId }, { driveFolder: 1, company: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      findHelper,
      [{ query: 'find', args: [{ customer: customerId, company: companyId }, { user: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyHelper, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyReferentHistory, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyEventHistory, { 'event.customer': customerId });
    sinon.assert.calledOnceWithExactly(deleteManyRepetition, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyCustomerPartner, { customer: customerId });
    sinon.assert.calledOnceWithExactly(
      updateOneUser,
      { _id: helperId },
      { $unset: { 'role.client': '', company: '' } }
    );
    sinon.assert.notCalled(deleteFileDrive);
  });

  it('should delete customer even without a helper', async () => {
    const companyId = new ObjectID();
    const customerId = new ObjectID();
    const customer = { _id: customerId, company: companyId };

    findOne.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));
    findHelper.returns(SinonMongoose.stubChainedQueries([[]], ['lean']));

    await CustomerHelper.removeCustomer(customerId);

    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: customerId }, { driveFolder: 1, company: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledWithExactly(
      findHelper,
      [{ query: 'find', args: [{ customer: customerId, company: companyId }, { user: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(deleteOne, { _id: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyHelper, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyReferentHistory, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyEventHistory, { 'event.customer': customerId });
    sinon.assert.calledOnceWithExactly(deleteManyRepetition, { customer: customerId });
    sinon.assert.calledOnceWithExactly(deleteManyCustomerPartner, { customer: customerId });
    sinon.assert.notCalled(updateOneUser);
    sinon.assert.notCalled(deleteFileDrive);
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
