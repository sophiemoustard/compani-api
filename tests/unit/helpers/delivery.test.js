const { ObjectId } = require('mongodb');
const sinon = require('sinon');
const { expect } = require('expect');
const SinonMongoose = require('../sinonMongoose');
const DeliveryHelper = require('../../../src/helpers/delivery');
const DraftBillsHelper = require('../../../src/helpers/draftBills');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');
const Customer = require('../../../src/models/Customer');
const Event = require('../../../src/models/Event');
const EventHistory = require('../../../src/models/EventHistory');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const User = require('../../../src/models/User');
const { NOT_INVOICED_AND_NOT_PAID, TIME_STAMPING_ACTIONS } = require('../../../src/helpers/constants');

describe('getAuxiliaries', () => {
  let findUsers;
  beforeEach(() => {
    findUsers = sinon.stub(User, 'find');
  });
  afterEach(() => {
    findUsers.restore();
  });

  it('should format events', async () => {
    const auxiliary1 = new ObjectId();
    const auxiliary2 = new ObjectId();
    const events = [
      { auxiliary: auxiliary1, _id: new ObjectId() },
      { auxiliary: auxiliary1, _id: new ObjectId() },
      { auxiliary: auxiliary2, _id: new ObjectId() },
    ];
    findUsers.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliary1 }, { _id: auxiliary2 }]));

    const result = await DeliveryHelper.getAuxiliaries(events);

    expect(result).toEqual({ [auxiliary1]: { _id: auxiliary1 }, [auxiliary2]: { _id: auxiliary2 } });
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
  });
});

describe('getCustomers', () => {
  let findCustomers;
  beforeEach(() => {
    findCustomers = sinon.stub(Customer, 'find');
  });
  afterEach(() => {
    findCustomers.restore();
  });

  it('should format events', async () => {
    const companyId = new ObjectId();
    const customer1 = new ObjectId();
    const customer2 = new ObjectId();
    const event1 = new ObjectId();
    const event2 = new ObjectId();
    const event3 = new ObjectId();
    const events = [
      { auxiliary: new ObjectId(), customer: customer1, _id: event1 },
      { auxiliary: new ObjectId(), customer: customer2, _id: event2 },
      { auxiliary: new ObjectId(), customer: customer1, _id: event3 },
    ];
    findCustomers.returns(SinonMongoose.stubChainedQueries([{ _id: customer1 }, { _id: customer2 }]));

    const result = await DeliveryHelper.getCustomers(events, companyId);

    expect(result).toEqual({ [customer1]: { _id: customer1 }, [customer2]: { _id: customer2 } });
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
  });
});

describe('getEventHistories', () => {
  let findEventHistories;
  beforeEach(() => {
    findEventHistories = sinon.stub(EventHistory, 'find');
  });
  afterEach(() => {
    findEventHistories.restore();
  });

  it('should format events', async () => {
    const companyId = new ObjectId();
    const event1 = new ObjectId();
    const event2 = new ObjectId();
    const event3 = new ObjectId();
    const events = [
      { auxiliary: new ObjectId(), customer: new ObjectId(), _id: event1 },
      { auxiliary: new ObjectId(), customer: new ObjectId(), _id: event2 },
      { auxiliary: new ObjectId(), customer: new ObjectId(), _id: event3 },
    ];
    findEventHistories.returns(SinonMongoose.stubChainedQueries(
      [
        { event: { eventId: event1 }, _id: '3' },
        { event: { eventId: event2 }, _id: '1' },
        { event: { eventId: event2 }, _id: '2' },
      ],
      ['lean']
    ));

    const result = await DeliveryHelper.getEventHistories(events, companyId);

    expect(result).toEqual({
      [event1]: [{ event: { eventId: event1 }, _id: '3' }],
      [event2]: [{ event: { eventId: event2 }, _id: '1' }, { event: { eventId: event2 }, _id: '2' }],
    });
    SinonMongoose.calledOnceWithExactly(
      findEventHistories,
      [
        {
          query: 'find',
          args: [{
            action: { $in: TIME_STAMPING_ACTIONS },
            'event.eventId': { $in: [event1, event2, event3] },
            company: companyId,
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('formatEvents', () => {
  let getAuxiliaries;
  let getCustomers;
  let getEventHistories;
  beforeEach(() => {
    getAuxiliaries = sinon.stub(DeliveryHelper, 'getAuxiliaries');
    getCustomers = sinon.stub(DeliveryHelper, 'getCustomers');
    getEventHistories = sinon.stub(DeliveryHelper, 'getEventHistories');
  });
  afterEach(() => {
    getAuxiliaries.restore();
    getCustomers.restore();
    getEventHistories.restore();
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
    getAuxiliaries.returns({ [auxiliary1]: { _id: auxiliary1 }, [auxiliary2]: { _id: auxiliary2 } });
    getCustomers.returns({ [customer1]: { _id: customer1 }, [customer2]: { _id: customer2 } });
    getEventHistories.returns({
      [event1]: [{ event: { eventId: event1 } }],
      [event2]: [{ event: { eventId: event2 } }],
    });

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
        histories: [],
        _id: event3,
      },
    ]);
    sinon.assert.calledOnceWithExactly(getAuxiliaries, events);
    sinon.assert.calledOnceWithExactly(getCustomers, events, companyId);
    sinon.assert.calledOnceWithExactly(getEventHistories, events, companyId);
  });
});

describe('formatNonBilledEvents', () => {
  let getDraftBillsList;
  beforeEach(() => {
    getDraftBillsList = sinon.stub(DraftBillsHelper, 'getDraftBillsList');
  });
  afterEach(() => {
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
  });

  it('should format non billed events', async () => {
    const companyId = new ObjectId();
    const startDate = '2021-10-12T09:00:00';
    const endDate = '2021-10-15T19:00:00';
    const events = [{ _id: 'ev1' }, { _id: 'ev2' }, { _id: 'ev4' }, { _id: 'ev5' }, { _id: 'ev9' }];
    getDraftBillsList.returns([
      {
        customer: { _id: 'cus1' },
        thirdPartyPayerBills: [{ bills: [{ eventsList: [{ event: 'ev1' }, { event: 'ev2' }] }] }],
      },
      { customer: { _id: 'cus2' }, customerBills: [{ bills: [{ eventsList: [{ event: 'ev9' }] }] }] },
      {
        customer: { _id: 'cus3' },
        thirdPartyPayerBills: [{ bills: [{ eventsList: [{ event: 'ev4' }] }] }],
      },
    ]);

    const result = await DeliveryHelper
      .formatNonBilledEvents(events, startDate, endDate, { company: { _id: companyId } });

    expect(result).toEqual([
      { _id: 'ev1', customer: 'cus1', event: 'ev1' },
      { _id: 'ev2', customer: 'cus1', event: 'ev2' },
      { _id: 'ev4', customer: 'cus3', event: 'ev4' },
    ]);
    sinon.assert.calledOnceWithExactly(
      getDraftBillsList,
      { startDate, endDate, eventIds: ['ev1', 'ev2', 'ev4', 'ev5', 'ev9'] },
      { company: { _id: companyId } }
    );
  });
});

describe('getEvents', () => {
  let findCustomers;
  let findEvents;
  let formatNonBilledEvents;
  let formatEvents;
  beforeEach(() => {
    findCustomers = sinon.stub(Customer, 'find');
    findEvents = sinon.stub(Event, 'find');
    formatNonBilledEvents = sinon.stub(DeliveryHelper, 'formatNonBilledEvents');
    formatEvents = sinon.stub(DeliveryHelper, 'formatEvents');
  });
  afterEach(() => {
    findCustomers.restore();
    findEvents.restore();
    formatNonBilledEvents.restore();
    formatEvents.restore();
  });

  it('should get events', async () => {
    const companyId = new ObjectId();
    const tpp1 = new ObjectId();
    const tpp2 = new ObjectId();
    const eventsIds = [new ObjectId(), new ObjectId(), new ObjectId()];
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
      { isBilled: true, _id: eventsIds[0], bills: { thirdPartyPayer: tpp1 } },
      { isBilled: false, _id: eventsIds[1] },
      { isBilled: true, _id: eventsIds[2], bills: { thirdPartyPayer: new ObjectId() } },
    ];
    findCustomers.returns(SinonMongoose.stubChainedQueries(customers, ['lean']));
    findEvents.returns(SinonMongoose.stubChainedQueries(events, ['lean']));
    formatNonBilledEvents.returns([{ isBilled: false, _id: eventsIds[1], customer: '098', histories: [] }]);
    formatEvents.returns([
      { isBilled: false, _id: eventsIds[1], auxiliary: 'auxiliary' },
      { isBilled: true, _id: eventsIds[0], auxiliary: 'aux' },
    ]);

    const result = await DeliveryHelper.getEvents(query, { company: { _id: companyId } });

    expect(result).toEqual([
      { isBilled: false, _id: eventsIds[1], auxiliary: 'auxiliary' },
      { isBilled: true, _id: eventsIds[0], auxiliary: 'aux' },
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
            endDate: { $gt: CompaniDate('09-2021', 'MM-yyyy').startOf('month').toDate() },
            startDate: { $lt: CompaniDate('09-2021', 'MM-yyyy').endOf('month').toDate() },
            auxiliary: { $exists: true },
            'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } },
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      formatNonBilledEvents,
      [{ isBilled: false, _id: eventsIds[1] }],
      CompaniDate('09-2021', 'MM-yyyy').startOf('month').toDate(),
      CompaniDate('09-2021', 'MM-yyyy').endOf('month').toDate(),
      { company: { _id: companyId } }
    );
    sinon.assert.calledOnceWithExactly(
      formatEvents,
      [
        { isBilled: false, _id: eventsIds[1], customer: '098', histories: [] },
        { isBilled: true, _id: eventsIds[0], bills: { thirdPartyPayer: tpp1 } },
      ],
      companyId
    );
  });

  it('should get only past events', async () => {
    const companyId = new ObjectId();
    const tpp1 = new ObjectId();
    const eventId = new ObjectId();
    const query = {
      thirdPartyPayers: [tpp1.toHexString()],
      month: CompaniDate().format('MM-yyyy'),
      onlyPastEvents: true,
    };
    const endDate = CompaniDate().oldSubtract({ days: 1 }).endOf('day').toDate();
    const customers = [{ _id: '321', fundings: [{ thirdPartyPayer: tpp1, subscription: '987' }] }];
    const events = [{ isBilled: true, _id: eventId, bills: { thirdPartyPayer: tpp1 } }];

    findCustomers.returns(SinonMongoose.stubChainedQueries(customers, ['lean']));
    findEvents.returns(SinonMongoose.stubChainedQueries(events, ['lean']));
    formatNonBilledEvents.returns([]);
    formatEvents.returns([{ isBilled: true, _id: eventId, auxiliary: 'aux' }]);

    const result = await DeliveryHelper.getEvents(query, { company: { _id: companyId } });

    expect(result).toEqual([{ isBilled: true, _id: eventId, auxiliary: 'aux' }]);
    SinonMongoose.calledOnceWithExactly(
      findCustomers,
      [
        {
          query: 'find',
          args: [{ 'fundings.thirdPartyPayer': { $in: [tpp1] }, company: companyId }, { fundings: 1 }],
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
            subscription: { $in: ['987'] },
            company: companyId,
            endDate: { $gt: CompaniDate().startOf('month').toDate() },
            startDate: { $lt: endDate },
            auxiliary: { $exists: true },
            'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } },
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      formatNonBilledEvents,
      [],
      CompaniDate().startOf('month').toDate(),
      endDate,
      { company: { _id: companyId } }
    );
    sinon.assert.calledOnceWithExactly(
      formatEvents,
      [{ isBilled: true, _id: eventId, bills: { thirdPartyPayer: tpp1 } }],
      companyId
    );
  });

  it('should get only events from last month event if onlyPastEvents is true', async () => {
    const companyId = new ObjectId();
    const tpp1 = new ObjectId();
    const eventId = new ObjectId();
    const query = { thirdPartyPayers: [tpp1.toHexString()], month: '12-2020', onlyPastEvents: true };
    const startOfMonth = CompaniDate('12-2020', 'MM-yyyy').startOf('month').toDate();
    const endOfMonth = CompaniDate('12-2020', 'MM-yyyy').endOf('month').toDate();
    const customers = [{ _id: '321', fundings: [{ thirdPartyPayer: tpp1, subscription: '987' }] }];
    const events = [{ isBilled: true, _id: eventId, bills: { thirdPartyPayer: tpp1 } }];

    findCustomers.returns(SinonMongoose.stubChainedQueries(customers, ['lean']));
    findEvents.returns(SinonMongoose.stubChainedQueries(events, ['lean']));
    formatNonBilledEvents.returns([]);
    formatEvents.returns([{ isBilled: true, _id: eventId, auxiliary: 'aux' }]);

    const result = await DeliveryHelper.getEvents(query, { company: { _id: companyId } });

    expect(result).toEqual([{ isBilled: true, _id: eventId, auxiliary: 'aux' }]);
    SinonMongoose.calledOnceWithExactly(
      findCustomers,
      [
        {
          query: 'find',
          args: [{ 'fundings.thirdPartyPayer': { $in: [tpp1] }, company: companyId }, { fundings: 1 }],
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
            subscription: { $in: ['987'] },
            company: companyId,
            endDate: { $gt: startOfMonth },
            startDate: { $lt: endOfMonth },
            auxiliary: { $exists: true },
            'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } },
          }],
        },
        { query: 'lean' },
      ]
    );
    sinon.assert.calledOnceWithExactly(
      formatNonBilledEvents,
      [],
      startOfMonth,
      endOfMonth,
      { company: { _id: companyId } }
    );
    sinon.assert.calledOnceWithExactly(
      formatEvents,
      [{ isBilled: true, _id: eventId, bills: { thirdPartyPayer: tpp1 } }],
      companyId
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

    expect(result).toEqual(`440-202109-APA-${CompaniDate().format('yyMMddhhmm')}.xml`);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: tppId }, { teletransmissionType: 1, companyCode: 1 }] }, { query: 'lean' }]
    );
  });
});

describe('getTimeStampInfo', () => {
  it('should return info for event with both timestamp', () => {
    const histories = [
      { createdAt: '2022-05-12T12:22:30.000Z', update: { startHour: '2022-05-12T12:22:30.000Z', isCancelled: true } },
      { createdAt: '2022-05-12T13:26:30.000Z', update: { endHour: '2022-05-12T13:26:30.000Z' } },
      { createdAt: '2022-05-12T12:24:30.000Z', update: { startHour: '2022-05-12T12:24:30.000Z' } },
      { createdAt: '2022-05-12T12:22:30.000Z', update: { endHour: '2022-05-12T12:22:30.000Z', isCancelled: true } },
    ];

    const timeStampInfo = DeliveryHelper.getTimeStampInfo({ histories });

    expect(timeStampInfo.startTimeStampList).toStrictEqual([
      { createdAt: '2022-05-12T12:24:30.000Z', update: { startHour: '2022-05-12T12:24:30.000Z' } },
      { createdAt: '2022-05-12T12:22:30.000Z', update: { startHour: '2022-05-12T12:22:30.000Z', isCancelled: true } },
    ]);
    expect(timeStampInfo.endTimeStampList).toStrictEqual([
      { createdAt: '2022-05-12T13:26:30.000Z', update: { endHour: '2022-05-12T13:26:30.000Z' } },
      { createdAt: '2022-05-12T12:22:30.000Z', update: { endHour: '2022-05-12T12:22:30.000Z', isCancelled: true } },
    ]);
    expect(timeStampInfo.hasTimeStamp).toBe(true);
  });

  it('should return info for event with startDate timestamp only', () => {
    const histories = [{ createdAt: '2022-05-12T12:22:30.000Z', update: { startHour: '2022-05-12T12:22:30.000Z' } }];

    const timeStampInfo = DeliveryHelper.getTimeStampInfo({ histories });

    expect(timeStampInfo.startTimeStampList).toStrictEqual([
      { createdAt: '2022-05-12T12:22:30.000Z', update: { startHour: '2022-05-12T12:22:30.000Z' } },
    ]);
    expect(timeStampInfo.endTimeStampList).toStrictEqual([]);
    expect(timeStampInfo.hasTimeStamp).toBe(true);
  });

  it('should return info for event with endDate timestamp only', () => {
    const histories = [{ createdAt: '2022-05-12T12:22:30.000Z', update: { endHour: '2022-05-12T12:22:30.000Z' } }];

    const timeStampInfo = DeliveryHelper.getTimeStampInfo({ histories });

    expect(timeStampInfo.startTimeStampList).toStrictEqual([]);
    expect(timeStampInfo.endTimeStampList).toStrictEqual([
      { createdAt: '2022-05-12T12:22:30.000Z', update: { endHour: '2022-05-12T12:22:30.000Z' } },
    ]);
    expect(timeStampInfo.hasTimeStamp).toBe(true);
  });

  it('should return info for event without timestamp', () => {
    const histories = [];

    const timeStampInfo = DeliveryHelper.getTimeStampInfo({ histories });

    expect(timeStampInfo.startTimeStampList).toStrictEqual([]);
    expect(timeStampInfo.endTimeStampList).toStrictEqual([]);
    expect(timeStampInfo.hasTimeStamp).toBe(false);
  });
});

describe('getTypeCode', () => {
  it('should get typeCode for event with both timestamp', () => {
    const typeCode = DeliveryHelper.getTypeCode([{ isCancelled: false }], [{}], true);

    expect(typeCode).toBe('');
  });

  it('should get typeCode for event with only startDate timestamp', () => {
    const typeCode = DeliveryHelper.getTypeCode([{ isCancelled: false }], [], true);

    expect(typeCode).toBe('COD');
  });

  it('should get typeCode for event with only endDate timestamp', () => {
    const typeCode = DeliveryHelper.getTypeCode([{ isCancelled: true }], [{ isCancelled: false }], true);

    expect(typeCode).toBe('COA');
  });

  it('should get typeCode for event with both timestamps but cancelled', () => {
    const typeCode = DeliveryHelper.getTypeCode([{ isCancelled: true }], [{ isCancelled: true }], true);

    expect(typeCode).toBe('CO2');
  });

  it('should get typeCode for event with no timestamps', () => {
    const typeCode = DeliveryHelper.getTypeCode([], [], false);

    expect(typeCode).toBe('CRE');
  });
});
