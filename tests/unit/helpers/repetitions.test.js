const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const Repetition = require('../../../src/models/Repetition');
const EventsHelper = require('../../../src/helpers/events');
const RepetitionHelper = require('../../../src/helpers/repetitions');
const SinonMongoose = require('../sinonMongoose');

describe('updateRepetitions', () => {
  let findOneRepetition;
  let formatEditionPayloadStub;
  let findOneAndUpdateRepetition;
  beforeEach(() => {
    findOneRepetition = sinon.stub(Repetition, 'findOne');
    formatEditionPayloadStub = sinon.stub(EventsHelper, 'formatEditionPayload');
    findOneAndUpdateRepetition = sinon.stub(Repetition, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneRepetition.restore();
    formatEditionPayloadStub.restore();
    findOneAndUpdateRepetition.restore();
  });

  it('should update a repetition', async () => {
    const parentId = new ObjectID();
    const repetition = { startDate: '2021-01-01T09:10:00.000Z', endDate: '2021-01-01T11:10:00.000Z' };
    const eventPayload = {
      startDate: '2020-12-01T10:30:00.000Z',
      endDate: '2021-12-01T11:30:00.000Z',
      _id: new ObjectID(),
      test: 's',
    };
    findOneRepetition.returns(SinonMongoose.stubChainedQueries([repetition], ['lean']));
    formatEditionPayloadStub.returns({ payload: 'payload' });

    const result = await RepetitionHelper.updateRepetitions(eventPayload, parentId);

    expect(result).toBeUndefined();
    SinonMongoose.calledWithExactly(findOneRepetition, [{ query: 'find', args: [{ parentId }] }, { query: 'lean' }]);
    sinon.assert.calledOnceWithExactly(findOneAndUpdateRepetition, { parentId }, { payload: 'payload' });
    sinon.assert.calledOnceWithExactly(
      formatEditionPayloadStub,
      repetition,
      { test: 's', startDate: '2021-01-01T10:30:00.000Z', endDate: '2021-01-01T11:30:00.000Z' },
      false
    );
  });

  it('should do nothing if repetition does not exist', async () => {
    const parentId = new ObjectID();
    findOneRepetition.returns(SinonMongoose.stubChainedQueries([], ['lean']));

    const result = await RepetitionHelper.updateRepetitions({}, parentId);

    expect(result).toBeUndefined();
    SinonMongoose.calledWithExactly(findOneRepetition, [{ query: 'find', args: [{ parentId }] }, { query: 'lean' }]);
    sinon.assert.notCalled(findOneAndUpdateRepetition);
    sinon.assert.notCalled(formatEditionPayloadStub);
  });
});
