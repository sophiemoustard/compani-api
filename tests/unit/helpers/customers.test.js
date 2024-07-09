const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const { expect } = require('expect');
const crypto = require('crypto');
const moment = require('moment');
const QRCode = require('qrcode');
const SinonMongoose = require('../sinonMongoose');
const CustomerQRCode = require('../../../src/data/pdf/customerQRCode');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const Drive = require('../../../src/models/Google/Drive');
const Rum = require('../../../src/models/Rum');
const SectorHistory = require('../../../src/models/SectorHistory');
const CustomerHelper = require('../../../src/helpers/customers');
const FundingsHelper = require('../../../src/helpers/fundings');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const SubscriptionsHelper = require('../../../src/helpers/subscriptions');
const EventRepository = require('../../../src/repositories/EventRepository');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

describe('getCustomersBySector', () => {
  let findSectorHistories;
  let findEvents;
  let populateSubscriptionsServices;
  beforeEach(() => {
    findSectorHistories = sinon.stub(SectorHistory, 'find');
    findEvents = sinon.stub(Event, 'find');
    populateSubscriptionsServices = sinon.stub(SubscriptionsHelper, 'populateSubscriptionsServices');
  });
  afterEach(() => {
    findSectorHistories.restore();
    findEvents.restore();
    populateSubscriptionsServices.restore();
  });

  it('should return customer by sector', async () => {
    const sectorId = new ObjectId();
    const query = { startDate: '2019-04-14T09:00:00', endDate: '2019-05-14T09:00:00', sector: sectorId.toHexString() };
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const auxiliaryIds = [new ObjectId(), new ObjectId()];
    const customerIds = [new ObjectId(), new ObjectId()];

    findSectorHistories.returns(SinonMongoose.stubChainedQueries(
      [{ auxiliary: auxiliaryIds[1] }, { auxiliary: auxiliaryIds[0] }],
      ['lean']
    ));
    findEvents.returns(SinonMongoose.stubChainedQueries(
      [
        { customer: { _id: customerIds[0] } },
        { customer: { _id: customerIds[0] } },
        { customer: { _id: customerIds[1] } },
      ],
      ['populate', 'lean']
    ));
    populateSubscriptionsServices.onCall(0).returns({ _id: customerIds[0], identity: {} });
    populateSubscriptionsServices.onCall(1).returns({ _id: customerIds[1], identity: {} });

    const result = await CustomerHelper.getCustomersBySector(query, credentials);

    expect(result).toEqual([{ _id: customerIds[0], identity: {} }, { _id: customerIds[1], identity: {} }]);

    sinon.assert.calledWithExactly(populateSubscriptionsServices.getCall(0), { _id: customerIds[0] });
    sinon.assert.calledWithExactly(populateSubscriptionsServices.getCall(1), { _id: customerIds[1] });
    SinonMongoose.calledOnceWithExactly(
      findSectorHistories,
      [
        {
          query: 'find',
          args: [
            {
              sector: { $in: [sectorId] },
              startDate: { $lte: '2019-05-14T09:00:00' },
              $or: [{ endDate: { $exists: false } }, { endDate: { $gte: '2019-04-14T09:00:00' } }],
              company: companyId,
            },
            { auxiliary: 1 },
          ],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findEvents,
      [
        {
          query: 'find',
          args: [
            {
              type: 'intervention',
              $or: [{ auxiliary: { $in: [auxiliaryIds[1], auxiliaryIds[0]] } }, { sector: { $in: [sectorId] } }],
              company: companyId,
              startDate: { $lte: '2019-05-14T09:00:00' },
              endDate: { $gte: '2019-04-14T09:00:00' },
            },
            { customer: 1 },
          ],
        },
        {
          query: 'populate',
          args: [{
            path: 'customer',
            select: 'subscriptions identity contact',
            populate: [
              { path: 'referentHistories', populate: { path: 'auxiliary' }, match: { company: companyId } },
              { path: 'subscriptions.service' },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
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
    const credentials = { company: { _id: new ObjectId() } };

    await CustomerHelper.getCustomersWithBilledEvents(credentials);

    sinon.assert.calledWithExactly(
      getCustomersWithBilledEvents,
      { isBilled: true, type: 'intervention' },
      credentials.company._id
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
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    findCustomer.returns(SinonMongoose.stubChainedQueries([]));

    const result = await CustomerHelper.getCustomers(credentials);

    expect(result).toEqual([]);
    sinon.assert.notCalled(subscriptionsAccepted);
    sinon.assert.notCalled(populateSubscriptionsServices);
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return customers', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const customers = [{ identity: { firstname: 'Emmanuel' }, company: companyId }, { company: companyId }];

    findCustomer.returns(SinonMongoose.stubChainedQueries(customers));
    populateSubscriptionsServices.onCall(0).returns({
      identity: { firstname: 'Emmanuel' },
      company: companyId,
      subscriptions: [{ unitTTCRate: 75 }],
    });
    populateSubscriptionsServices.onCall(1).returns({ company: companyId, subscriptions: [{ unitTTCRate: 10 }] });
    subscriptionsAccepted.onCall(0).returns({
      identity: { firstname: 'Emmanuel' },
      company: companyId,
      subscriptionsAccepted: true,
    });
    subscriptionsAccepted.onCall(1).returns({ company: companyId, subscriptionsAccepted: true });

    const result = await CustomerHelper.getCustomers(credentials);

    expect(result).toEqual([
      { identity: { firstname: 'Emmanuel' }, subscriptionsAccepted: true, company: companyId },
      { subscriptionsAccepted: true, company: companyId },
    ]);
    sinon.assert.calledTwice(subscriptionsAccepted);
    sinon.assert.calledTwice(populateSubscriptionsServices);
    sinon.assert.calledWithExactly(
      subscriptionsAccepted.getCall(0),
      {
        identity: { firstname: 'Emmanuel' },
        company: companyId,
        subscriptions: [{ unitTTCRate: 75 }],
      }
    );
    sinon.assert.calledWithExactly(
      subscriptionsAccepted.getCall(1),
      { company: companyId, subscriptions: [{ unitTTCRate: 10 }] }
    );
    sinon.assert.calledWithExactly(
      populateSubscriptionsServices.getCall(0),
      { identity: { firstname: 'Emmanuel' }, company: companyId }
    );
    sinon.assert.calledWithExactly(populateSubscriptionsServices.getCall(1), { company: companyId });
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return only archived customer', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const query = { archived: true };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId, archivedAt: '2021-09-10T00:00:00' },
      { identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' }, company: companyId },
    ];

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers[0]]));
    populateSubscriptionsServices.returns({
      identity: { firstname: 'Emmanuel' },
      company: companyId,
      archivedAt: '2021-09-10T00:00:00',
      subscriptions: [{ unitTTCRate: 75 }],
    });
    subscriptionsAccepted.returns({
      identity: { firstname: 'Emmanuel' },
      company: companyId,
      archivedAt: '2021-09-10T00:00:00',
      subscriptionsAccepted: true,
    });

    const result = await CustomerHelper.getCustomers(credentials, query);

    expect(result).toEqual([{
      identity: { firstname: 'Emmanuel' },
      archivedAt: '2021-09-10T00:00:00',
      subscriptionsAccepted: true,
      company: companyId,
    }]);
    sinon.assert.calledOnceWithExactly(
      subscriptionsAccepted,
      {
        identity: { firstname: 'Emmanuel' },
        company: companyId,
        archivedAt: '2021-09-10T00:00:00',
        subscriptions: [{ unitTTCRate: 75 }],
      }
    );
    sinon.assert.calledOnceWithExactly(
      populateSubscriptionsServices,
      { identity: { firstname: 'Emmanuel' }, company: companyId, archivedAt: '2021-09-10T00:00:00' }
    );
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId, archivedAt: { $ne: null } }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return only non-archived customer', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const query = { archived: false };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId, archivedAt: '2021-09-10T00:00:00' },
      { identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' }, company: companyId },
    ];

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers[1]]));
    populateSubscriptionsServices.returns({
      identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' },
      company: companyId,
      subscriptions: [{ unitTTCRate: 75 }],
    });
    subscriptionsAccepted.returns({
      identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' },
      company: companyId,
      subscriptionsAccepted: true,
    });

    const result = await CustomerHelper.getCustomers(credentials, query);

    expect(result).toEqual([
      {
        identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' },
        subscriptionsAccepted: true,
        company: companyId,
      },
    ]);
    sinon.assert.calledOnceWithExactly(
      subscriptionsAccepted,
      {
        identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' },
        company: companyId,
        subscriptions: [{ unitTTCRate: 75 }],
      }
    );
    sinon.assert.calledOnceWithExactly(
      populateSubscriptionsServices,
      { identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' }, company: companyId }
    );
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId, archivedAt: { $eq: null } }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return only stopped customer', async () => {
    const companyId = new ObjectId();
    const today = CompaniDate().startOf('day').toDate();
    const credentials = { company: { _id: companyId } };
    const query = { stopped: true };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId, stoppedAt: '2021-10-10T00:00:00' },
      { identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' }, company: companyId },
    ];

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers[0]]));
    populateSubscriptionsServices.returns({
      identity: { firstname: 'Emmanuel' },
      company: companyId,
      stoppedAt: '2021-10-10T00:00:00',
      subscriptions: [{ unitTTCRate: 75 }],
    });
    subscriptionsAccepted.returns({
      identity: { firstname: 'Emmanuel' },
      company: companyId,
      stoppedAt: '2021-10-10T00:00:00',
      subscriptionsAccepted: true,
    });

    const result = await CustomerHelper.getCustomers(credentials, query);

    expect(result).toEqual([{
      identity: { firstname: 'Emmanuel' },
      stoppedAt: '2021-10-10T00:00:00',
      subscriptionsAccepted: true,
      company: companyId,
    }]);
    sinon.assert.calledOnceWithExactly(
      subscriptionsAccepted,
      {
        identity: { firstname: 'Emmanuel' },
        company: companyId,
        stoppedAt: '2021-10-10T00:00:00',
        subscriptions: [{ unitTTCRate: 75 }],
      }
    );
    sinon.assert.calledOnceWithExactly(
      populateSubscriptionsServices,
      { identity: { firstname: 'Emmanuel' }, company: companyId, stoppedAt: '2021-10-10T00:00:00' }
    );
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        {
          query: 'find',
          args: [{
            company: companyId,
            $and: [{ stoppedAt: { $ne: null } }, { stoppedAt: { $lte: today } }],
          }],
        },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return only non-stopped customer', async () => {
    const companyId = new ObjectId();
    const today = CompaniDate().startOf('day').toDate();
    const credentials = { company: { _id: companyId } };
    const query = { stopped: false };
    const customers = [
      { identity: { firstname: 'Emmanuel' }, company: companyId, stoppedAt: '2021-10-10T00:00:00' },
      { identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' }, company: companyId },
    ];

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers[1]]));
    populateSubscriptionsServices.returns({
      identity: { firstname: 'Jean-Paul' },
      company: companyId,
      subscriptions: [{ unitTTCRate: 25 }],
    });
    subscriptionsAccepted.returns({
      identity: { firstname: 'Jean-Paul' },
      company: companyId,
      subscriptionsAccepted: true,
    });

    const result = await CustomerHelper.getCustomers(credentials, query);

    expect(result).toEqual([{
      identity: { firstname: 'Jean-Paul' },
      subscriptionsAccepted: true,
      company: companyId,
    }]);
    sinon.assert.calledOnceWithExactly(
      subscriptionsAccepted,
      {
        identity: { firstname: 'Jean-Paul' },
        company: companyId,
        subscriptions: [{ unitTTCRate: 25 }],
      }
    );
    sinon.assert.calledOnceWithExactly(
      populateSubscriptionsServices,
      { identity: { firstname: 'Jean-Paul', lastname: 'Belmondot' }, company: companyId }
    );
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        {
          query: 'find',
          args: [{
            company: companyId,
            $or: [{ stoppedAt: { $eq: null } }, { stoppedAt: { $gt: today } }],
          }],
        },
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

    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const query = { company: companyId };

    findCustomer.returns(SinonMongoose.stubChainedQueries(customers));

    const result = await CustomerHelper.getCustomersFirstIntervention(query, credentials);

    expect(result).toEqual({
      123456: { _id: '123456', firstIntervention: { _id: 'poiuy', startDate: '2019-09-10T00:00:00' } },
      '0987': { _id: '0987', firstIntervention: { _id: 'sdfg', startDate: '2019-09-10T00:00:00' } },
    });
    SinonMongoose.calledOnceWithExactly(
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
    const customer = { _id: new ObjectId(), identity: { firstname: 'toto', lastname: 'test' } };
    getCustomersWithInterventionStub.returns([customer]);
    const credentials = { company: { _id: new ObjectId() } };

    const result = await CustomerHelper.getCustomersWithIntervention(credentials);

    expect(result).toEqual([customer]);
    sinon.assert.calledOnce(getCustomersWithInterventionStub);
    sinon.assert.calledWithExactly(getCustomersWithInterventionStub, credentials.company._id);
  });
});

describe('formatServiceInPopulate', () => {
  it('should return subscription with last version only', () => {
    const subscription = {
      _id: new ObjectId(),
      versions: [{ startDate: '2021-01-10' }, { startDate: '2021-09-20' }, { startDate: '2020-12-10' }],
    };

    const rep = CustomerHelper.formatServiceInPopulate(subscription);

    expect(rep).toEqual({ ...subscription, versions: { startDate: '2021-09-20' }, startDate: '2021-09-20' });
  });
});

describe('getCustomersWithSubscriptions', () => {
  let findCustomer;
  let formatServiceInPopulate;

  beforeEach(() => {
    findCustomer = sinon.stub(Customer, 'find');
    formatServiceInPopulate = sinon.stub(CustomerHelper, 'formatServiceInPopulate');
  });

  afterEach(() => {
    findCustomer.restore();
    formatServiceInPopulate.restore();
  });

  it('should return customers with subscriptions', async () => {
    const companyId = new ObjectId();
    const customersWithSubscriptions = [{ identity: { lastname: 'Fred' }, subscriptions: [{ _id: new ObjectId() }] }];
    findCustomer.returns(SinonMongoose.stubChainedQueries(customersWithSubscriptions, ['populate', 'select', 'lean']));

    const rep = await CustomerHelper.getCustomersWithSubscriptions({ company: { _id: companyId } });

    expect(rep).toEqual(customersWithSubscriptions);
    SinonMongoose.calledOnceWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service', transform: formatServiceInPopulate }] },
        {
          query: 'populate',
          args: [{
            path: 'referentHistories',
            match: { company: companyId },
            populate: { path: 'auxiliary', select: 'identity' },
          }],
        },
        { query: 'select', args: ['subscriptions identity contact stoppedAt archivedAt referentHistories'] },
        { query: 'lean' },
      ]
    );
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
    const credentials = { company: { _id: new ObjectId() } };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(null));

    const result = await CustomerHelper.getCustomer(customerId, credentials);

    expect(result).toBeNull();
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [
        { query: 'findOne', args: [{ _id: customerId }] },
        {
          query: 'populate',
          args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge versions.billingItems' } }],
        },
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
    const credentials = { company: { _id: new ObjectId() } };
    const customer = { identity: { firstname: 'Emmanuel' } };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer));
    populateSubscriptionsServices.callsFake(cus => ({ ...cus, subscriptions: 2 }));
    subscriptionsAccepted.callsFake(cus => ({ ...cus, subscriptionsAccepted: true }));

    const result = await CustomerHelper.getCustomer(customerId, credentials);

    expect(result).toEqual({ identity: { firstname: 'Emmanuel' }, subscriptions: 2, subscriptionsAccepted: true });
    sinon.assert.calledOnce(populateSubscriptionsServices);
    sinon.assert.calledOnce(subscriptionsAccepted);
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [
        { query: 'findOne', args: [{ _id: customerId }] },
        {
          query: 'populate',
          args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge versions.billingItems' } }],
        },
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
    const credentials = { company: { _id: new ObjectId() } };
    const customer = { identity: { firstname: 'Emmanuel' }, fundings: [{ _id: '1234' }, { _id: '09876' }] };

    findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer));
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
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [
        { query: 'findOne', args: [{ _id: customerId }] },
        {
          query: 'populate',
          args: [{ path: 'subscriptions.service', populate: { path: 'versions.surcharge versions.billingItems' } }],
        },
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
    const companyId = new ObjectId();

    findOneAndUpdateRum.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await CustomerHelper.getRumNumber(companyId);

    SinonMongoose.calledOnceWithExactly(
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
        { query: 'lean' },
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
    const company = { _id: new ObjectId(), prefixNumber: 101 };
    const rumNumber = { prefix: '1219', seq: 1 };
    const formattedRumNumber = 'R-1011219000010987654321';
    const customerId = new ObjectId();
    const customer = { payment: { bankAccountNumber: '', iban: 'FR4717569000303461796573B36', bic: '', mandates: [] } };
    const payload = { payment: { iban: 'FR8312739000501844178231W37' } };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
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
    SinonMongoose.calledOnceWithExactly(
      findByIdCustomer,
      [{ query: 'findById', args: [customerId] }, { query: 'lean' }]
    );
  });

  it('shouldn\'t generate a new mandate (create iban)', async () => {
    const company = { _id: new ObjectId(), prefixNumber: 101 };
    const customerId = new ObjectId();
    const customer = { payment: { bankAccountNumber: '', iban: '', bic: '', mandates: [] } };
    const payload = { payment: { iban: 'FR4717569000303461796573B36' } };

    findByIdCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));

    const result = await CustomerHelper.formatPaymentPayload(customerId, payload, company);

    expect(result).toEqual({ $set: { 'payment.iban': 'FR4717569000303461796573B36' } });
    sinon.assert.notCalled(getRumNumber);
    sinon.assert.notCalled(formatRumNumber);
    sinon.assert.notCalled(updateOne);
    SinonMongoose.calledOnceWithExactly(
      findByIdCustomer,
      [{ query: 'findById', args: [customerId] }, { query: 'lean' }]
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

describe('generateQRCode', () => {
  let findOneCustomer;
  let toDataURL;
  let getPdf;
  beforeEach(() => {
    findOneCustomer = sinon.stub(Customer, 'findOne');
    toDataURL = sinon.stub(QRCode, 'toDataURL');
    getPdf = sinon.stub(CustomerQRCode, 'getPdf');
  });
  afterEach(() => {
    findOneCustomer.restore();
    toDataURL.restore();
    getPdf.restore();
  });

  it('should generate customer\'s qr code pdf', async () => {
    const customerId = new ObjectId();
    const customer = { _id: customerId, identity: { firstname: 'N\'Golo', lastname: 'Compté' } };

    toDataURL.returns('my_pic_in_base_64');
    findOneCustomer.returns(SinonMongoose.stubChainedQueries(customer, ['lean']));
    getPdf.returns('pdf');

    const result = await CustomerHelper.generateQRCode(customerId);

    expect(result).toEqual({ fileName: 'qrcode.pdf', pdf: 'pdf' });
    sinon.assert.calledOnceWithExactly(toDataURL, `${customerId}`, { margin: 0 });
    SinonMongoose.calledOnceWithExactly(
      findOneCustomer,
      [{ query: 'findOne', args: [{ _id: customerId }, { identity: 1 }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(getPdf, { qrCode: 'my_pic_in_base_64', customerName: 'N\'Golo COMPTÉ' });
  });
});
