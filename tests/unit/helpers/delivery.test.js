const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const moment = require('moment');
const expect = require('expect');
const SinonMongoose = require('../sinonMongoose');
const DeliveryHelper = require('../../../src/helpers/delivery');
const DraftBillsHelper = require('../../../src/helpers/draftBills');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const EventHistory = require('../../../src/models/EventHistory');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const User = require('../../../src/models/User');
const { NOT_INVOICED_AND_NOT_PAID, TIME_STAMPING_ACTIONS } = require('../../../src/helpers/constants');

describe('formatEvents', () => {
  let findUsers;
  let findCustomers;
  let findEventHistories;
  beforeEach(() => {
    findUsers = sinon.stub(User, 'find');
    findCustomers = sinon.stub(Customer, 'find');
    findEventHistories = sinon.stub(EventHistory, 'find');
  });
  afterEach(() => {
    findUsers.restore();
    findCustomers.restore();
    findEventHistories.restore();
  });

  it('should format events', async () => {
    const companyId = new ObjectId();
    const auxiliary1 = new ObjectId();
    const auxiliary2 = new ObjectId();
    const customer1 = new ObjectId();
    const customer2 = new ObjectId();
    const event1 = new ObjectId();
    const event2 = new ObjectId();
    const event3 = new ObjectId();
    const events = [
      { auxiliary: auxiliary1, customer: customer1, _id: event1 },
      { auxiliary: auxiliary1, customer: customer2, _id: event2 },
      { auxiliary: auxiliary2, customer: customer1, _id: event3 },
    ];
    findUsers.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliary1 }, { _id: auxiliary2 }]));
    findCustomers.returns(SinonMongoose.stubChainedQueries([{ _id: customer1 }, { _id: customer2 }]));
    findEventHistories.returns(SinonMongoose.stubChainedQueries(
      [{ event: { eventId: event1 } }, { event: { eventId: event2 } }, { event: { eventId: event3 } }],
      ['lean']
    ));

    const result = await DeliveryHelper.formatEvents(events, companyId);

    expect(result).toEqual([
      {
        auxiliary: { _id: auxiliary1 },
        customer: { _id: customer1 },
        histories: [{ event: { eventId: event1 } }],
        _id: event1,
      },
      {
        auxiliary: { _id: auxiliary1 },
        customer: { _id: customer2 },
        histories: [{ event: { eventId: event2 } }],
        _id: event2,
      },
      {
        auxiliary: { _id: auxiliary2 },
        customer: { _id: customer1 },
        histories: [{ event: { eventId: event3 } }],
        _id: event3,
      },
    ]);
    SinonMongoose.calledOnceWithExactly(
      findUsers,
      [
        {
          query: 'find',
          args: [{ _id: { $in: [auxiliary1, auxiliary1, auxiliary2] } }, { identity: 1, serialNumber: 1 }],
        },
        { query: 'populate', args: [{ path: 'establishment' }] },
        { query: 'populate', args: [{ path: 'company', populate: { path: 'company' } }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCustomers,
      [
        {
          query: 'find',
          args: [
            { _id: { $in: [customer1, customer2, customer1] }, company: companyId },
            { 'contact.primaryAddress': 1, identity: 1, fundings: 1, serialNumber: 1, subscriptions: 1 },
          ],
        },
        { query: 'populate', args: [{ path: 'fundings.thirdPartyPayer', select: 'teletransmissionId name type' }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findEventHistories,
      [
        {
          query: 'find',
          args: [{
            action: { $in: TIME_STAMPING_ACTIONS },
            'event.eventId': { $in: [event1, event2, event3] },
            company: companyId,
            isCancelled: false,
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('formatNonBilledEvents', () => {
  let formatEvents;
  let getDraftBillsList;
  beforeEach(() => {
    formatEvents = sinon.stub(DeliveryHelper, 'formatEvents');
    getDraftBillsList = sinon.stub(DraftBillsHelper, 'getDraftBillsList');
  });
  afterEach(() => {
    formatEvents.restore();
    getDraftBillsList.restore();
  });

  it('should return [] if no events', async () => {
    const companyId = new ObjectId();
    const startDate = '2021-10-12T09:00:00';
    const endDate = '2021-10-15T19:00:00';
    const events = [];

    const result = await DeliveryHelper
      .formatNonBilledEvents(events, startDate, endDate, { company: { _id: companyId } });

    expect(result).toEqual([]);
    sinon.assert.notCalled(getDraftBillsList);
    sinon.assert.notCalled(formatEvents);
  });

  it('should format non billed events', async () => {
    const companyId = new ObjectId();
    const startDate = '2021-10-12T09:00:00';
    const endDate = '2021-10-15T19:00:00';
    const events = [{ _id: 'ev1' }, { _id: 'ev2' }, { _id: 'ev4' }, { _id: 'ev5' }, { _id: 'ev9' }];
    getDraftBillsList.returns([
      {
        customer: { _id: 'cus1' },
        thirdPartyPayerBills: [{ bills: [{ eventsList: [{ _id: 'ev1' }, { _id: 'ev2' }] }] }],
      },
      { customer: { _id: 'cus2' }, customerBills: [{ bills: [{ eventsList: [{ _id: 'ev9' }] }] }] },
      {
        customer: { _id: 'cus3' },
        thirdPartyPayerBills: [{ bills: [{ eventsList: [{ _id: 'ev4' }] }] }],
      },
    ]);
    formatEvents.returns([
      { histories: [], _id: 'ev1', customer: 'cus1' },
      { histories: [], _id: 'ev2', customer: 'cus1' },
      { histories: [], _id: 'ev4', customer: 'cus3' },
    ]);

    const result = await DeliveryHelper
      .formatNonBilledEvents(events, startDate, endDate, { company: { _id: companyId } });

    expect(result).toEqual([
      { histories: [], _id: 'ev1', customer: 'cus1' },
      { histories: [], _id: 'ev2', customer: 'cus1' },
      { histories: [], _id: 'ev4', customer: 'cus3' },
    ]);
    sinon.assert.calledOnceWithExactly(
      getDraftBillsList,
      { startDate, endDate, eventIds: ['ev1', 'ev2', 'ev4', 'ev5', 'ev9'] },
      { company: { _id: companyId } }
    );
    sinon.assert.calledOnceWithExactly(
      formatEvents,
      [{ _id: 'ev1', customer: 'cus1' }, { _id: 'ev2', customer: 'cus1' }, { _id: 'ev4', customer: 'cus3' }],
      companyId
    );
  });
});

describe('formatBilledEvents', () => {
  let formatEvents;
  beforeEach(() => {
    formatEvents = sinon.stub(DeliveryHelper, 'formatEvents');
  });
  afterEach(() => {
    formatEvents.restore();
  });

  it('should return [] if no events', async () => {
    const companyId = new ObjectId();
    const events = [];

    const result = await DeliveryHelper.formatBilledEvents(events, { company: { _id: companyId } });

    expect(result).toEqual([]);
    sinon.assert.notCalled(formatEvents);
  });

  it('should format events', async () => {
    const companyId = new ObjectId();
    const events = [{ _id: 'event1' }, { _id: 'event2' }];
    formatEvents.returns([{ auxiliary: { _id: '12' }, _id: 'event1' }, { auxiliary: { _id: '45' }, _id: 'event2' }]);

    const result = await DeliveryHelper.formatBilledEvents(events, { company: { _id: companyId } });

    expect(result).toEqual([{ auxiliary: { _id: '12' }, _id: 'event1' }, { auxiliary: { _id: '45' }, _id: 'event2' }]);
    sinon.assert.calledOnceWithExactly(formatEvents, [{ _id: 'event1' }, { _id: 'event2' }], companyId);
  });
});

describe('getEvents', () => {
  let findCustomers;
  let findEvents;
  let formatBilledEvents;
  let formatNonBilledEvents;
  beforeEach(() => {
    findCustomers = sinon.stub(Customer, 'find');
    findEvents = sinon.stub(Event, 'find');
    formatBilledEvents = sinon.stub(DeliveryHelper, 'formatBilledEvents');
    formatNonBilledEvents = sinon.stub(DeliveryHelper, 'formatNonBilledEvents');
  });
  afterEach(() => {
    findCustomers.restore();
    findEvents.restore();
    formatBilledEvents.restore();
    formatNonBilledEvents.restore();
  });

  it('should get events', async () => {
    const companyId = new ObjectId();
    const tpp1 = new ObjectId();
    const tpp2 = new ObjectId();
    const query = { thirdPartyPayers: [tpp1.toHexString(), tpp2.toHexString()], month: '09-2021' };
    const customers = [
      {
        _id: '098',
        fundings: [{ thirdPartyPayer: tpp1, subscription: '234' }, { thirdPartyPayer: tpp2, subscription: '111' }],
      },
      {
        _id: '321',
        fundings: [
          { thirdPartyPayer: tpp1, subscription: '987' },
          { thirdPartyPayer: new ObjectId(), subscription: '435' },
        ],
      },
    ];
    const events = [
      { isBilled: true, _id: 'billed', bills: { thirdPartyPayer: tpp1 } },
      { isBilled: false, _id: 'not_billed' },
      { isBilled: true, _id: 'billedbutwrongtpp', bills: { thirdPartyPayer: new ObjectId() } },
    ];
    findCustomers.returns(SinonMongoose.stubChainedQueries(customers, ['lean']));
    findEvents.returns(SinonMongoose.stubChainedQueries(events, ['lean']));
    formatNonBilledEvents.returns([{ isBilled: false, _id: 'not_billed', auxiliary: 'auxiliary' }]);
    formatBilledEvents.returns([{ isBilled: true, _id: 'billed', auxiliary: 'aux' }]);

    const result = await DeliveryHelper.getEvents(query, { company: { _id: companyId } });

    expect(result).toEqual([
      { isBilled: false, _id: 'not_billed', auxiliary: 'auxiliary' },
      { isBilled: true, _id: 'billed', auxiliary: 'aux' },
    ]);
    SinonMongoose.calledOnceWithExactly(
      findCustomers,
      [
        {
          query: 'find',
          args: [{ 'fundings.thirdPartyPayer': { $in: [tpp1, tpp2] }, company: companyId }, { fundings: 1 }],
        },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findEvents,
      [
        {
          query: 'find',
          args: [{
            subscription: { $in: ['234', '111', '987'] },
            company: companyId,
            endDate: { $gt: moment('09-2021', 'MM-YYYY').startOf('month').toDate() },
            startDate: { $lt: moment('09-2021', 'MM-YYYY').endOf('month').toDate() },
            auxiliary: { $exists: true },
            'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } },
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      formatNonBilledEvents,
      [{ isBilled: false, _id: 'not_billed' }],
      moment('09-2021', 'MM-YYYY').startOf('month').toDate(),
      moment('09-2021', 'MM-YYYY').endOf('month').toDate(),
      { company: { _id: companyId } }
    );
    sinon.assert.calledOnceWithExactly(
      formatBilledEvents,
      [{ isBilled: true, _id: 'billed', bills: { thirdPartyPayer: tpp1 } }],
      { company: { _id: companyId } }
    );
  });
});

describe('getFileName', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(ThirdPartyPayer, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return file name', async () => {
    const tppId = new ObjectId();
    const query = { thirdPartyPayers: [tppId], month: '09-2021' };
    const thirdPartyPayer = { teletransmissionType: 'APA', companyCode: '440' };
    findOne.returns(SinonMongoose.stubChainedQueries(thirdPartyPayer, ['lean']));

    const result = await DeliveryHelper.getFileName(query);

    expect(result).toEqual(`440-202109-APA-${moment().format('YYMMDDHHmm')}.xml`);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: tppId }, { teletransmissionType: 1, companyCode: 1 }] }, { query: 'lean' }]
    );
  });
});
