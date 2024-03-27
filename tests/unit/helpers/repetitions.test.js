const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
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
    const parentId = new ObjectId();
    const repetition = { startDate: '2021-01-01T09:10:00.000Z', endDate: '2021-01-01T11:10:00.000Z' };
    const eventPayload = {
      startDate: '2020-12-01T10:30:00.000Z',
      endDate: '2021-12-01T11:30:00.000Z',
      _id: new ObjectId(),
      test: 's',
    };
    findOneRepetition.returns(SinonMongoose.stubChainedQueries(repetition, ['lean']));
    formatEditionPayloadStub.returns({ payload: 'payload' });

    const result = await RepetitionHelper.updateRepetitions(eventPayload, parentId);

    expect(result).toBeUndefined();
    SinonMongoose.calledOnceWithExactly(
      findOneRepetition,
      [{ query: 'findOne', args: [{ parentId }] }, { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(findOneAndUpdateRepetition, { parentId }, { payload: 'payload' });
    sinon.assert.calledOnceWithExactly(
      formatEditionPayloadStub,
      repetition,
      { test: 's', startDate: '2021-01-01T10:30:00.000Z', endDate: '2021-01-01T11:30:00.000Z' },
      false
    );
  });

  it('should do nothing if repetition does not exist', async () => {
    const parentId = new ObjectId();
    findOneRepetition.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    const result = await RepetitionHelper.updateRepetitions({}, parentId);

    expect(result).toBeUndefined();
    SinonMongoose.calledOnceWithExactly(
      findOneRepetition,
      [{ query: 'findOne', args: [{ parentId }] }, { query: 'lean' }]
    );
    sinon.assert.notCalled(findOneAndUpdateRepetition);
    sinon.assert.notCalled(formatEditionPayloadStub);
  });
});

describe('formatPayloadForRepetitionCreation', () => {
  it('should format payload for repetition creation', async () => {
    const eventId = new ObjectId();
    const event = {
      _id: eventId,
      startDate: '2020-12-01T10:30:00.000Z',
      endDate: '2020-12-01T12:30:00.000Z',
    };
    const payload = {
      misc: 'Super note pour verifier que ce champ n\'est pas appliqué a la repetition au moment de la creation.',
      startDate: '2020-12-01T11:30:00.000Z',
      repetition: { startDate: '2020-01-01T09:10:00.000Z', endDate: '2020-01-01T11:10:00.000Z' },
    };
    const companyId = new ObjectId();

    const result = await RepetitionHelper.formatPayloadForRepetitionCreation(event, payload, companyId);

    expect(result).toEqual({
      startDate: '2020-12-01T11:30:00.000Z',
      company: companyId,
      repetition: { startDate: '2020-01-01T09:10:00.000Z', endDate: '2020-01-01T11:10:00.000Z', parentId: eventId },
    });
  });
});
