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
    formatArrayOrStringQueryParam.returns([{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query);

    expect(result).toEqual({ $or: [{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }] });
  });

  it('should format query with sectors and auxiliaries', () => {
    const query = { sectors: ['toto', 'tata'], auxiliaries: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.onCall(0).returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    formatArrayOrStringQueryParam.onCall(1).returns([{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query);

    expect(result).toEqual({ $or: [{ sectors: 'toto' }, { sectors: 'tata' }, { auxiliaries: 'toto' }, { auxiliaries: 'tata' }] });
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

describe('createEventHistoryOnUpdate', () => {
  let formatEventHistoryForAuxiliaryUpdate;
  let formatEventHistoryForDatesUpdate;
  let formatEventHistoryForCancelUpdate;
  let save;
  beforeEach(() => {
    formatEventHistoryForAuxiliaryUpdate = sinon.stub(EventHistoryHelper, 'formatEventHistoryForAuxiliaryUpdate');
    formatEventHistoryForDatesUpdate = sinon.stub(EventHistoryHelper, 'formatEventHistoryForDatesUpdate');
    formatEventHistoryForCancelUpdate = sinon.stub(EventHistoryHelper, 'formatEventHistoryForCancelUpdate');
    save = sinon.stub(EventHistory.prototype, 'save');
  });
  afterEach(() => {
    formatEventHistoryForAuxiliaryUpdate.restore();
    formatEventHistoryForDatesUpdate.restore();
    formatEventHistoryForCancelUpdate.restore();
    save.restore();
  });

  it('should call formatEventHistoryForAuxiliaryUpdate', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      misc: 'Toto',
    };
    const event = {
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'intervention',
    };
    const credentials = { _id: 'james bond' };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWith(
      formatEventHistoryForAuxiliaryUpdate,
      {
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
        },
      },
      payload,
      event
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatEventHistoryForDatesUpdate);
    sinon.assert.notCalled(formatEventHistoryForCancelUpdate);
  });

  it('should call formatEventHistoryForDatesUpdate', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      misc: 'Toto',
    };
    const event = {
      startDate: '2019-01-22T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'intervention',
    };
    const credentials = { _id: 'james bond' };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWith(
      formatEventHistoryForDatesUpdate,
      {
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
        },
      },
      payload,
      event
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatEventHistoryForAuxiliaryUpdate);
    sinon.assert.notCalled(formatEventHistoryForCancelUpdate);
  });

  it('should call formatEventHistoryForCancelUpdate', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      misc: 'Toto',
      isCancelled: true,
      cancel: { reason: 'toto', condition: 'payé' },
    };
    const event = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'intervention',
    };
    const credentials = { _id: 'james bond' };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWith(
      formatEventHistoryForCancelUpdate,
      {
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
        },
      },
      payload,
      event
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatEventHistoryForAuxiliaryUpdate);
    sinon.assert.notCalled(formatEventHistoryForDatesUpdate);
  });

  it('should add repetition when repetition is updated', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      misc: 'Toto',
      shouldUpdateRepetition: true,
    };
    const event = {
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'intervention',
      repetition: { frequency: 'every_two_weeks' },
    };
    const credentials = { _id: 'james bond' };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWith(
      formatEventHistoryForAuxiliaryUpdate,
      {
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
          repetition: { frequency: 'every_two_weeks' },
        },
      },
      payload,
      event
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatEventHistoryForDatesUpdate);
    sinon.assert.notCalled(formatEventHistoryForCancelUpdate);
  });

  it('should add internal hour type for internal hour event', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      misc: 'Toto',
    };
    const event = {
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'internalHour',
      internalHour: { name: 'meeting' },
    };
    const credentials = { _id: 'james bond' };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWith(
      formatEventHistoryForAuxiliaryUpdate,
      {
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'internalHour',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
          internalHour: { name: 'meeting' },
        },
      },
      payload,
      event
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatEventHistoryForDatesUpdate);
    sinon.assert.notCalled(formatEventHistoryForCancelUpdate);
  });

  it('should add absence type for absence event', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      misc: 'Toto',
    };
    const event = {
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'absence',
      absence: 'leave',
    };
    const credentials = { _id: 'james bond' };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWith(
      formatEventHistoryForAuxiliaryUpdate,
      {
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'absence',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
          absence: 'leave',
        },
      },
      payload,
      event
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatEventHistoryForDatesUpdate);
    sinon.assert.notCalled(formatEventHistoryForCancelUpdate);
  });
});

describe('formatEventHistoryForAuxiliaryUpdate', () => {
  it('should format event history when auxiliary is updated', () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      sector: '1234567890',
      auxiliary: 'qwertyuiop',
    };
    const event = {
      auxiliary: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      sector: new ObjectID('5d3aba5866ec0f0e97cd0320'),
    };

    const result = EventHistoryHelper.formatEventHistoryForAuxiliaryUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: {
        auxiliary: { from: '5d3aba5866ec0f0e97cd031f', to: 'qwertyuiop' },
      },
      sectors: ['5d3aba5866ec0f0e97cd0320', '1234567890'],
      auxiliaries: ['5d3aba5866ec0f0e97cd031f', 'qwertyuiop'],
    });
  });

  it('should format event history when auxiliary is removed (Unassign)', () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      sector: '5d3aba5866ec0f0e97cd0320',
    };
    const event = {
      auxiliary: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      sector: new ObjectID('5d3aba5866ec0f0e97cd0320'),
    };

    const result = EventHistoryHelper.formatEventHistoryForAuxiliaryUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: {
        auxiliary: { from: '5d3aba5866ec0f0e97cd031f' },
      },
      sectors: ['5d3aba5866ec0f0e97cd0320'],
      auxiliaries: ['5d3aba5866ec0f0e97cd031f'],
    });
  });

  it('should format event history when auxiliary is added (Assign)', () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      sector: '1234567890',
      auxiliary: 'qwertyuiop',
    };
    const event = {
      sector: new ObjectID('5d3aba5866ec0f0e97cd0320'),
    };

    const result = EventHistoryHelper.formatEventHistoryForAuxiliaryUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: {
        auxiliary: { to: 'qwertyuiop' },
      },
      sectors: ['5d3aba5866ec0f0e97cd0320', '1234567890'],
      auxiliaries: ['qwertyuiop'],
    });
  });
});

describe('formatEventHistoryForCancelUpdate', () => {
  it('should format event history with one auxiliary', () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: {
        type: 'intervention',
      },
    };
    const payload = {
      cancel: { reason: 'toto', condition: 'tata' },
      auxiliary: new ObjectID(),
      sector: new ObjectID(),
    };

    const result = EventHistoryHelper.formatEventHistoryForCancelUpdate(mainInfo, payload);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [payload.sector],
      auxiliaries: [payload.auxiliary],
      event: {
        type: 'intervention',
        auxiliary: payload.auxiliary,
      },
      update: {
        cancel: { reason: 'toto', condition: 'tata' },
      },
    });
  });

  it('should format event history without auxiliary', () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: {
        type: 'intervention',
      },
    };
    const payload = {
      cancel: { reason: 'toto', condition: 'tata' },
      sector: '5d3aba5866ec0f0e97cd0320',
    };

    const result = EventHistoryHelper.formatEventHistoryForCancelUpdate(mainInfo, payload);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: ['5d3aba5866ec0f0e97cd0320'],
      event: {
        type: 'intervention',
      },
      update: {
        cancel: { reason: 'toto', condition: 'tata' },
      },
    });
  });
});
