const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const UtilsHelper = require('../../../helpers/utils');
const EventHistoryHelper = require('../../../helpers/eventHistories');
const EventHistory = require('../../../models/EventHistory');

require('sinon-mongoose');

describe('getListQuery', () => {
  let formatArrayOrStringQueryParam;
  beforeEach(() => {
    formatArrayOrStringQueryParam = sinon.stub(UtilsHelper, 'formatArrayOrStringQueryParam');
  });
  afterEach(() => {
    formatArrayOrStringQueryParam.restore();
  });

  it('should return empty object if no query', () => {
    const result = EventHistoryHelper.getListQuery({});

    expect(result).toEqual({});
  });

  it('should format query with sectors', () => {
    const query = { sectors: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query);

    expect(result).toEqual({ $or: [{ sectors: 'toto' }, { sectors: 'tata' }] });
  });

  it('should format query with auxiliaries', () => {
    const query = { auxiliaries: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.returns([{ auxiliaries: 'toto'}, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query);

    expect(result).toEqual({ $or: [{ auxiliaries: 'toto'}, { auxiliaries: 'tata' }] });
  });

  it('should format query with sectors and auxiliaries', () => {
    const query = { sectors: ['toto', 'tata'], auxiliaries: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.onCall(0).returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    formatArrayOrStringQueryParam.onCall(1).returns([{ auxiliaries: 'toto'}, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query);

    expect(result).toEqual({ $or: [{ sectors: 'toto' }, { sectors: 'tata' }, { auxiliaries: 'toto'}, { auxiliaries: 'tata' }] });
  });
});

describe('createEventHistory', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(EventHistory.prototype, 'save');
  });
  afterEach(() => {
    save.restore();
  });

  it('should save event history', async () => {
    const payload = { _id: new ObjectID(), auxiliary: new ObjectID() };
    const credentials = { _id: new ObjectID() };
    await EventHistoryHelper.createEventHistory(payload, credentials, 'event_creation');

    sinon.assert.called(save);
  });
});

describe('createEventHistoryOnCreate', () => {
  let createEventHistory;
  beforeEach(() => {
    createEventHistory = sinon.stub(EventHistoryHelper, 'createEventHistory');
  });
  afterEach(() => {
    createEventHistory.restore();
  });

  it('should call createEventHistory with creation action', async () => {
    const payload = { _id: new ObjectID(), auxiliary: new ObjectID() };
    const credentials = { _id: new ObjectID() };
    await EventHistoryHelper.createEventHistoryOnCreate(payload, credentials);

    sinon.assert.calledWith(createEventHistory, payload, credentials, 'event_creation');
  });
});

describe('createEventHistoryOnDelete', () => {
  let createEventHistory;
  beforeEach(() => {
    createEventHistory = sinon.stub(EventHistoryHelper, 'createEventHistory');
  });
  afterEach(() => {
    createEventHistory.restore();
  });

  it('should call createEventHistory with creation action', async () => {
    const payload = { _id: new ObjectID(), auxiliary: new ObjectID() };
    const credentials = { _id: new ObjectID() };
    await EventHistoryHelper.createEventHistoryOnDelete(payload, credentials);

    sinon.assert.calledWith(createEventHistory, payload, credentials, 'event_deletion');
  });
});
