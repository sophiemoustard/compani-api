const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
require('sinon-mongoose');

const Repetition = require('../../../src/models/Repetition');
const Company = require('../../../src/models/Company');
const Event = require('../../../src/models/Event');
const EventsRepetitionHelper = require('../../../src/helpers/eventsRepetition');
const EmailHelper = require('../../../src/helpers/email');
const eventRepetitions = require('../../../src/jobs/eventRepetitions');

describe('method', () => {
  let EventMock;
  let RepetitionMock;
  let CompanyMock;
  let CreateFutureEventBasedOnRepetitionStub;
  let EmailHelperStub;
  let eventRepetitionsOnCompleteStub;
  let date;
  const fakeDate = moment('2019-09-20').startOf('d').toDate();
  beforeEach(() => {
    RepetitionMock = sinon.mock(Repetition);
    CompanyMock = sinon.mock(Company);
    EventMock = sinon.mock(Event);
    CreateFutureEventBasedOnRepetitionStub = sinon.stub(EventsRepetitionHelper, 'createFutureEventBasedOnRepetition');
    EmailHelperStub = sinon.stub(EmailHelper, 'completeEventRepScriptEmail');
    eventRepetitionsOnCompleteStub = sinon.stub(eventRepetitions, 'onComplete');
    date = sinon.useFakeTimers(fakeDate);
  });
  afterEach(() => {
    EventMock.restore();
    RepetitionMock.restore();
    CompanyMock.restore();
    CreateFutureEventBasedOnRepetitionStub.restore();
    EmailHelperStub.restore();
    eventRepetitionsOnCompleteStub.restore();
    date.restore();
  });

  const frequencies = [
    { type: 'every_day', dates: { startDate: '2019-09-16T06:00:00.000Z', endDate: '2019-09-16T07:00:00.000Z' } },
    { type: 'every_week', dates: { startDate: '2019-09-12T06:00:00.000Z', endDate: '2019-09-12T07:00:00.000Z' } },
    { type: 'every_week_day', dates: { startDate: '2019-09-19T06:00:00.000Z', endDate: '2019-09-19T07:00:00.000Z' } },
    { type: 'every_two_weeks', dates: { startDate: '2019-08-29T06:00:00.000Z', endDate: '2019-08-29T07:00:00.000Z' } },
  ];
  frequencies.forEach((freq) => {
    const repetition = [{
      _id: '5d84f869b7e67963c6523704',
      type: 'intervention',
      customer: '5d4420d306ab3d00147caf11',
      subscription: '5d4422b306ab3d00147caf13',
      auxiliary: '5d121abe9ff937001403b6c6',
      sector: '5d1a40b7ecb0da251cfa4ff2',
      startDate: freq.dates.startDate,
      endDate: freq.dates.endDate,
      status: 'contract_with_company',
      frequency: freq.type,
      parentId: '5d84f869b7e67963c65236a9',
    }];

    it(`should create a J+90 event for ${freq.type} repetition object`, async () => {
      const server = 'server';
      const companyId = new ObjectID();

      CompanyMock.expects('find')
        .withExactArgs({})
        .chain('lean')
        .once()
        .returns([{ _id: companyId }]);
      RepetitionMock.expects('find')
        .withExactArgs({ startDate: { $lt: fakeDate }, company: companyId })
        .chain('lean')
        .once()
        .returns(repetition);

      const futureEvent = new Event({
        type: 'intervention',
        company: new ObjectID(),
        customer: '5d4420d306ab3d00147caf11',
        subscription: '5d4422b306ab3d00147caf13',
        auxiliary: '5d121abe9ff937001403b6c6',
        sector: '5d1a40b7ecb0da251cfa4ff2',
        startDate: moment().add(90, 'd').set({ hours: 8, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
        endDate: moment().add(90, 'd').set({ hours: 9, minutes: 0, seconds: 0, milliseconds: 0 }).toDate(),
        status: 'contract_with_company',
        repetition: {
          frequency: freq,
          parentId: '5d84f869b7e67963c65236a9',
        },
      });
      CreateFutureEventBasedOnRepetitionStub.returns(futureEvent);
      EventMock.expects('insertMany')
        .withArgs([futureEvent])
        .once()
        .returns([futureEvent]);

      await eventRepetitions.method(server);

      sinon.assert.calledWith(CreateFutureEventBasedOnRepetitionStub, repetition[0]);
      RepetitionMock.verify();
      EventMock.verify();
      CompanyMock.verify();
      sinon.assert.calledWith(eventRepetitionsOnCompleteStub, server, [futureEvent], []);
    });
  });

  it('should log repetitions ids which failed to create J+90 event', async () => {
    const server = { log: (tags, text) => `${tags}, ${text}` };
    const serverLogStub = sinon.stub(server, 'log');
    const error = new Error('Test error.');
    const repetition = [{
      _id: '5d84f869b7e67963c6523704',
      type: 'intervention',
      customer: '5d4420d306ab3d00147caf11',
      subscription: '5d4422b306ab3d00147caf13',
      auxiliary: '5d121abe9ff937001403b6c6',
      sector: '5d1a40b7ecb0da251cfa4ff2',
      startDate: '2019-09-16T06:00:00.000Z',
      endDate: '2019-09-16T06:00:00.000Z',
      status: 'contract_with_company',
      frequency: 'every_day',
      parentId: '5d84f869b7e67963c65236a9',
    }];

    const companyId = new ObjectID();
    CompanyMock.expects('find')
      .withExactArgs({})
      .chain('lean')
      .once()
      .returns([{ _id: companyId }]);

    RepetitionMock
      .expects('find')
      .withExactArgs({ startDate: { $lt: fakeDate }, company: companyId })
      .chain('lean')
      .once()
      .returns(repetition);

    CreateFutureEventBasedOnRepetitionStub.returns(Promise.reject(error));

    await eventRepetitions.method(server);

    RepetitionMock.verify();
    CompanyMock.verify();
    sinon.assert.calledWith(serverLogStub, ['error', 'cron', 'jobs'], error);
    sinon.assert.calledWith(eventRepetitionsOnCompleteStub, server, [], [repetition[0]._id]);
  });
});
