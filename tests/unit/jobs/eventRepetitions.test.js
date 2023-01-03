const sinon = require('sinon');
const { expect } = require('expect');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const SinonMongoose = require('../sinonMongoose');
const Repetition = require('../../../src/models/Repetition');
const Company = require('../../../src/models/Company');
const Event = require('../../../src/models/Event');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const CustomerAbsencesHelper = require('../../../src/helpers/customerAbsences');
const eventRepetitions = require('../../../src/jobs/eventRepetitions');

describe('method', () => {
  let create;
  let findRepetition;
  let findCompany;
  let formatEventBasedOnRepetitionStub;
  let date;
  const fakeDate = moment('2019-09-20').startOf('d').toDate();
  const server = { log: (tags, text) => `${tags}, ${text}` };
  let serverLogStub;
  let deleteOneRepetition;
  let isAbsent;
  beforeEach(() => {
    create = sinon.stub(Event, 'create');
    findRepetition = sinon.stub(Repetition, 'find');
    findCompany = sinon.stub(Company, 'find');
    formatEventBasedOnRepetitionStub = sinon.stub(EventsRepetitionHelper, 'formatEventBasedOnRepetition');
    date = sinon.useFakeTimers(fakeDate);
    serverLogStub = sinon.stub(server, 'log');
    deleteOneRepetition = sinon.stub(Repetition, 'deleteOne');
    isAbsent = sinon.stub(CustomerAbsencesHelper, 'isAbsent');
  });
  afterEach(() => {
    create.restore();
    findRepetition.restore();
    findCompany.restore();
    formatEventBasedOnRepetitionStub.restore();
    date.restore();
    serverLogStub.restore();
    deleteOneRepetition.restore();
    isAbsent.restore();
  });

  const frequencies = [
    { type: 'every_day', dates: { startDate: '2019-09-16T06:00:00.000Z', endDate: '2019-09-16T07:00:00.000Z' } },
    { type: 'every_week', dates: { startDate: '2019-09-12T06:00:00.000Z', endDate: '2019-09-12T07:00:00.000Z' } },
    { type: 'every_week_day', dates: { startDate: '2019-09-19T06:00:00.000Z', endDate: '2019-09-19T07:00:00.000Z' } },
    { type: 'every_two_weeks', dates: { startDate: '2019-08-29T06:00:00.000Z', endDate: '2019-08-29T07:00:00.000Z' } },
  ];
  const customerId = new ObjectId();

  frequencies.forEach((freq) => {
    const repetition = [{
      _id: '5d84f869b7e67963c6523704',
      type: 'intervention',
      customer: { _id: customerId },
      subscription: '5d4422b306ab3d00147caf13',
      auxiliary: '5d121abe9ff937001403b6c6',
      sector: '5d1a40b7ecb0da251cfa4ff2',
      startDate: freq.dates.startDate,
      endDate: freq.dates.endDate,
      frequency: freq.type,
      parentId: '5d84f869b7e67963c65236a9',
    }];

    it(`should create a J+90 event for ${freq.type} repetition object`, async () => {
      const companyId = new ObjectId();
      const newEventStartDate = moment(new Date()).add(90, 'd')
        .set({ hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });

      const futureEvent = {
        type: 'intervention',
        company: new ObjectId(),
        customer: { _id: new ObjectId() },
        subscription: '5d4422b306ab3d00147caf13',
        auxiliary: '5d121abe9ff937001403b6c6',
        sector: '5d1a40b7ecb0da251cfa4ff2',
        startDate: newEventStartDate,
        endDate: moment(new Date()).add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }),
        repetition: {
          frequency: freq,
          parentId: '5d84f869b7e67963c65236a9',
        },
      };

      findRepetition.returns(SinonMongoose.stubChainedQueries(repetition));
      findCompany.returns(SinonMongoose.stubChainedQueries([{ _id: companyId }], ['lean']));

      formatEventBasedOnRepetitionStub.returns(futureEvent);
      create.returns(futureEvent);
      isAbsent.returns(false);

      const result = await eventRepetitions.method(server);

      expect(result).toMatchObject({ results: [futureEvent], errors: [], deletedRepetitions: [] });
      sinon.assert.calledWith(formatEventBasedOnRepetitionStub, repetition[0], new Date());
      SinonMongoose.calledOnceWithExactly(
        findRepetition,
        [
          { query: 'find', args: [{ startDate: { $lt: fakeDate }, company: companyId }] },
          { query: 'populate', args: [{ path: 'customer', select: 'stoppedAt' }] },
          { query: 'lean' },
        ]
      );
      SinonMongoose.calledOnceWithExactly(
        findCompany,
        [{ query: 'find', args: [{ 'subscriptions.erp': true }] }, { query: 'lean' }]
      );
      sinon.assert.calledOnceWithExactly(isAbsent, repetition[0].customer._id, newEventStartDate);
      sinon.assert.calledOnceWithExactly(create, futureEvent);
      sinon.assert.notCalled(deleteOneRepetition);
    });
  });

  it('should delete a stopped customer\'s repetitions and not create an event', async () => {
    const companyId = new ObjectId();
    const repetitions = [{
      _id: '5d84f869b7e67963c6523704',
      type: 'intervention',
      customer: { _id: new ObjectId(), stoppedAt: '2018-06-30T23:59:59.000Z' },
      subscription: '5d4422b306ab3d00147caf13',
      auxiliary: '5d121abe9ff937001403b6c6',
      sector: '5d1a40b7ecb0da251cfa4ff2',
      startDate: '2021-03-30T16:00:00.000Z',
      endDate: '2021-03-30T18:00:00.000Z',
      frequency: 'every_day',
      parentId: '5d84f869b7e67963c65236a9',
    }];

    findCompany.returns(SinonMongoose.stubChainedQueries([{ _id: companyId }], ['lean']));
    findRepetition.returns(SinonMongoose.stubChainedQueries(repetitions));

    const result = await eventRepetitions.method(server);

    expect(result).toMatchObject({ results: [], errors: [], deletedRepetitions: [repetitions[0]] });
    SinonMongoose.calledOnceWithExactly(
      findRepetition,
      [
        { query: 'find', args: [{ startDate: { $lt: fakeDate }, company: companyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'stoppedAt' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCompany,
      [{ query: 'find', args: [{ 'subscriptions.erp': true }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(deleteOneRepetition, { _id: repetitions[0]._id });
    sinon.assert.notCalled(formatEventBasedOnRepetitionStub);
    sinon.assert.notCalled(create);
  });

  it('should only create J+90 event for a certain type of repetition object', async () => {
    const repetitions = [
      {
        _id: '5d84f869b7e67963c6523704',
        type: 'intervention',
        customer: { _id: new ObjectId() },
        subscription: '5d4422b306ab3d00147caf13',
        auxiliary: '5d121abe9ff937001403b6c6',
        startDate: '2020-02-02T10:20:00',
        endDate: '2020-02-02T12:20:00',
        frequency: 'every_day',
        parentId: '5d84f869b7e67963c65236a9',
      },
      {
        _id: '5d84f869b7e67963c6523704',
        type: 'internal_hour',
        auxiliary: '5d121abe9ff937001403b6c6',
        startDate: '2020-02-03T10:20:00',
        endDate: '2020-02-03T12:20:00',
        frequency: 'every_day',
        parentId: '5d84f869b7e67963c65236a9',
      },
    ];
    const companyId = new ObjectId();

    findRepetition.returns(SinonMongoose.stubChainedQueries(repetitions));
    findCompany.returns(SinonMongoose.stubChainedQueries([{ _id: companyId }], ['lean']));

    const futureEvent = new Event({
      type: 'internal_hour',
      company: new ObjectId(),
      auxiliary: '5d121abe9ff937001403b6c6',
      startDate: moment().add(90, 'd').set({ hours: 10, minutes: 20, seconds: 0, milliseconds: 0 }).toDate(),
      endDate: moment().add(90, 'd').set({ hours: 12, minutes: 20, seconds: 0, milliseconds: 0 }).toDate(),
      repetition: {
        frequency: 'every_day',
        parentId: '5d84f869b7e67963c65236a9',
      },
    });
    formatEventBasedOnRepetitionStub.returns(futureEvent);
    create.returns(futureEvent);

    const result = await eventRepetitions.method({ ...server, query: { type: 'internal_hour' } });

    expect(result).toMatchObject({ results: [futureEvent], errors: [], deletedRepetitions: [] });
    sinon.assert.calledWith(formatEventBasedOnRepetitionStub, repetitions[1], new Date());
    SinonMongoose.calledOnceWithExactly(
      findRepetition,
      [
        { query: 'find', args: [{ startDate: { $lt: fakeDate }, company: companyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'stoppedAt' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCompany,
      [{ query: 'find', args: [{ 'subscriptions.erp': true }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(create, futureEvent);
    sinon.assert.notCalled(deleteOneRepetition);
  });

  it('should log repetitions ids which failed to create J+90 event', async () => {
    const error = new Error('Test error.');
    const repetition = [{
      _id: '5d84f869b7e67963c6523704',
      type: 'intervention',
      customer: { _id: new ObjectId() },
      subscription: '5d4422b306ab3d00147caf13',
      auxiliary: '5d121abe9ff937001403b6c6',
      sector: '5d1a40b7ecb0da251cfa4ff2',
      startDate: '2019-09-16T06:00:00.000Z',
      endDate: '2019-09-16T06:00:00.000Z',
      frequency: 'every_day',
      parentId: '5d84f869b7e67963c65236a9',
    }];

    const companyId = new ObjectId();

    findRepetition.returns(SinonMongoose.stubChainedQueries(repetition));
    findCompany.returns(SinonMongoose.stubChainedQueries([{ _id: companyId }], ['lean']));

    formatEventBasedOnRepetitionStub.returns(Promise.reject(error));

    const result = await eventRepetitions.method(server);

    expect(result).toMatchObject({ results: [], errors: [repetition[0]._id], deletedRepetitions: [] });
    SinonMongoose.calledOnceWithExactly(
      findRepetition,
      [
        { query: 'find', args: [{ startDate: { $lt: fakeDate }, company: companyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'stoppedAt' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCompany,
      [{ query: 'find', args: [{ 'subscriptions.erp': true }] }, { query: 'lean' }]
    );
    sinon.assert.calledWith(serverLogStub, ['error', 'cron', 'jobs'], error);
  });

  it('should not create an event of a repetition if customer is absent', async () => {
    const companyId = new ObjectId();
    const auxiliaryId = new ObjectId();
    const subscriptionId = new ObjectId();
    const sectorId = new ObjectId();
    const parentId = new ObjectId();
    const repetition = [{
      _id: '5d84f869b7e67963c6523704',
      type: 'intervention',
      customer: { _id: new ObjectId() },
      subscription: subscriptionId,
      auxiliary: auxiliaryId,
      sector: sectorId,
      startDate: '2019-09-16T06:00:00.000Z',
      endDate: '2019-09-16T06:00:00.000Z',
      frequency: 'every_day',
      parentId,
    }];
    const newEventStartDate = moment(new Date()).add(90, 'd')
      .set({ hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });
    const futureEvent = {
      type: 'intervention',
      company: new ObjectId(),
      customer: { _id: new ObjectId() },
      subscription: subscriptionId,
      auxiliary: auxiliaryId,
      sector: sectorId,
      startDate: newEventStartDate,
      endDate: moment(new Date()).add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }),
      repetition: { frequency: 'every_day', parentId },
    };

    findRepetition.returns(SinonMongoose.stubChainedQueries(repetition));
    findCompany.returns(SinonMongoose.stubChainedQueries([{ _id: companyId }], ['lean']));
    formatEventBasedOnRepetitionStub.returns(futureEvent);
    isAbsent.returns(true);

    const result = await eventRepetitions.method(server);

    expect(result).toMatchObject({ results: [], errors: [], deletedRepetitions: [] });
    SinonMongoose.calledOnceWithExactly(
      findRepetition,
      [
        { query: 'find', args: [{ startDate: { $lt: fakeDate }, company: companyId }] },
        { query: 'populate', args: [{ path: 'customer', select: 'stoppedAt' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findCompany,
      [{ query: 'find', args: [{ 'subscriptions.erp': true }] }, { query: 'lean' }]
    );
    sinon.assert.notCalled(formatEventBasedOnRepetitionStub);
    sinon.assert.notCalled(create);
    sinon.assert.notCalled(deleteOneRepetition);
    sinon.assert.calledOnceWithExactly(isAbsent, repetition[0].customer._id, newEventStartDate);
  });
});
