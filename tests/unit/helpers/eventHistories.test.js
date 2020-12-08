const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const UtilsHelper = require('../../../src/helpers/utils');
const EventHistoryHelper = require('../../../src/helpers/eventHistories');
const EventHistoryRepository = require('../../../src/repositories/EventHistoryRepository');
const EventHistory = require('../../../src/models/EventHistory');
const User = require('../../../src/models/User');
const { INTERNAL_HOUR } = require('../../../src/helpers/constants');

require('sinon-mongoose');

describe('getEventHistories', () => {
  let getListQueryStub;
  let paginateStub;
  beforeEach(() => {
    getListQueryStub = sinon.stub(EventHistoryHelper, 'getListQuery');
    paginateStub = sinon.stub(EventHistoryRepository, 'paginate');
  });
  afterEach(() => {
    getListQueryStub.restore();
    paginateStub.restore();
  });

  it('should get event histories', async () => {
    const query = { createdAt: '2019-11-10' };
    const credentials = { company: { _id: new ObjectID() } };
    const listQuery = {
      $and: [
        { company: credentials.company._id },
        { $or: [{ createdAt: { $lte: '2019-11-10' } }] },
      ],
    };
    getListQueryStub.returns(listQuery);
    paginateStub.returns([]);
    const result = await EventHistoryHelper.getEventHistories(query, credentials);
    expect(result).toEqual([]);
    getListQueryStub.calledWithExactly(query, credentials);
    paginateStub.calledWithExactly(query, listQuery, query.createdAt, credentials);
  });
});

describe('getListQuery', () => {
  let formatArrayOrStringQueryParam;
  beforeEach(() => {
    formatArrayOrStringQueryParam = sinon.stub(UtilsHelper, 'formatArrayOrStringQueryParam');
  });
  afterEach(() => {
    formatArrayOrStringQueryParam.restore();
  });

  it('should return at least company if no query', () => {
    const credentials = { company: { _id: new ObjectID() } };
    const result = EventHistoryHelper.getListQuery({}, credentials);

    expect(result).toEqual({ company: credentials.company._id });
  });

  it('should format query with sectors', () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { sectors: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({
      company: credentials.company._id,
      $or: [{ sectors: 'toto' }, { sectors: 'tata' }],
    });
  });

  it('should format query with auxiliaries', () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { auxiliaries: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.returns([{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({
      company: credentials.company._id,
      $or: [{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }],
    });
  });

  it('should format query with createdAt', () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { createdAt: '2019-10-11' };
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({
      company: credentials.company._id,
      createdAt: { $lte: '2019-10-11' },
    });
  });

  it('should format query with sectors and auxiliaries and createdAt', () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { sectors: ['toto', 'tata'], auxiliaries: ['toto', 'tata'], createdAt: '2019-10-11' };
    formatArrayOrStringQueryParam.onCall(0).returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    formatArrayOrStringQueryParam.onCall(1).returns([{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({
      company: credentials.company._id,
      createdAt: { $lte: '2019-10-11' },
      $or: [
        { sectors: 'toto' },
        { sectors: 'tata' },
        { auxiliaries: 'toto' },
        { auxiliaries: 'tata' },
      ],
    });
  });
});

describe('createEventHistory', () => {
  let create;
  let UserMock;
  beforeEach(() => {
    create = sinon.stub(EventHistory, 'create');
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    create.restore();
    UserMock.restore();
  });

  it('should save event history with auxiliary in payload', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const payload = { _id: new ObjectID(), auxiliary: auxiliaryId.toHexString() };
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    UserMock.expects('findOne')
      .withExactArgs({ _id: payload.auxiliary })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ sector: sectorId });
    await EventHistoryHelper.createEventHistory(payload, credentials, 'event_creation');

    sinon.assert.calledWithExactly(
      create,
      {
        createdBy: credentials._id,
        action: 'event_creation',
        company: companyId,
        auxiliaries: [auxiliaryId.toHexString()],
        sectors: [sectorId.toHexString()],
        event: { auxiliary: auxiliaryId.toHexString() },
      }
    );
    UserMock.verify();
  });

  it('should save event history with sector in payload', async () => {
    const companyId = new ObjectID();
    const sectorId = new ObjectID();
    const payload = { _id: new ObjectID(), sector: sectorId.toHexString(), type: 'intervention' };
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    UserMock.expects('findOne').never();
    await EventHistoryHelper.createEventHistory(payload, credentials, 'event_creation');

    sinon.assert.calledWithExactly(
      create,
      {
        createdBy: credentials._id,
        action: 'event_creation',
        company: companyId,
        sectors: [sectorId.toHexString()],
        event: { type: 'intervention' },
      }
    );
    UserMock.verify();
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

    sinon.assert.calledWithExactly(createEventHistory, payload, credentials, 'event_creation');
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

    sinon.assert.calledWithExactly(createEventHistory, payload, credentials, 'event_deletion');
  });
});

describe('createEventHistoryOnUpdate', () => {
  let formatHistoryForAuxiliaryUpdate;
  let formatHistoryForDatesUpdate;
  let formatHistoryForCancelUpdate;
  let formatHistoryForHoursUpdate;
  let save;
  beforeEach(() => {
    formatHistoryForAuxiliaryUpdate = sinon.stub(EventHistoryHelper, 'formatHistoryForAuxiliaryUpdate');
    formatHistoryForDatesUpdate = sinon.stub(EventHistoryHelper, 'formatHistoryForDatesUpdate');
    formatHistoryForCancelUpdate = sinon.stub(EventHistoryHelper, 'formatHistoryForCancelUpdate');
    formatHistoryForHoursUpdate = sinon.stub(EventHistoryHelper, 'formatHistoryForHoursUpdate');
    save = sinon.stub(EventHistory.prototype, 'save');
  });
  afterEach(() => {
    formatHistoryForAuxiliaryUpdate.restore();
    formatHistoryForDatesUpdate.restore();
    formatHistoryForCancelUpdate.restore();
    formatHistoryForHoursUpdate.restore();
    save.restore();
  });

  it('should call formatHistoryForAuxiliaryUpdate', async () => {
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
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForAuxiliaryUpdate,
      {
        company: credentials.company._id,
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
      event,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForDatesUpdate);
    sinon.assert.notCalled(formatHistoryForCancelUpdate);
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
  });

  it('should call formatHistoryForDatesUpdate', async () => {
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
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForDatesUpdate,
      {
        company: credentials.company._id,
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
      event,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForAuxiliaryUpdate);
    sinon.assert.notCalled(formatHistoryForCancelUpdate);
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
  });

  it('should call formatHistoryForCancelUpdate', async () => {
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
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForCancelUpdate,
      {
        company: credentials.company._id,
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
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForAuxiliaryUpdate);
    sinon.assert.notCalled(formatHistoryForDatesUpdate);
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
  });

  it('should call formatHistoryForHoursUpdate', async () => {
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      misc: 'Toto',
    };
    const event = {
      startDate: '2019-01-21T10:38:18',
      endDate: '2019-01-21T11:38:18',
      customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
      type: 'intervention',
    };
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForHoursUpdate,
      {
        company: credentials.company._id,
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
      event,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForAuxiliaryUpdate);
    sinon.assert.notCalled(formatHistoryForDatesUpdate);
    sinon.assert.notCalled(formatHistoryForCancelUpdate);
  });

  it('should call formatHistoryForDatesUpdate and formatHistoryForCancelUpdate', async () => {
    const payload = {
      startDate: '2019-01-20T09:38:18',
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
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForCancelUpdate,
      {
        company: credentials.company._id,
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'intervention',
          startDate: '2019-01-20T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
        },
      },
      payload,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForAuxiliaryUpdate);
    sinon.assert.calledWithExactly(
      formatHistoryForDatesUpdate,
      {
        company: credentials.company._id,
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: 'intervention',
          startDate: '2019-01-20T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
        },
      },
      payload,
      event,
      credentials.company._id
    );
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
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
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForAuxiliaryUpdate,
      {
        company: credentials.company._id,
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
      event,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForDatesUpdate);
    sinon.assert.notCalled(formatHistoryForCancelUpdate);
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
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
      type: INTERNAL_HOUR,
      internalHour: { name: 'meeting' },
    };
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForAuxiliaryUpdate,
      {
        company: credentials.company._id,
        createdBy: 'james bond',
        action: 'event_update',
        event: {
          type: INTERNAL_HOUR,
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: new ObjectID('5d3aba5866ec0f0e97cd031f'),
          misc: 'Toto',
          internalHour: { name: 'meeting' },
        },
      },
      payload,
      event,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForDatesUpdate);
    sinon.assert.notCalled(formatHistoryForCancelUpdate);
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
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
    const credentials = { _id: 'james bond', company: { _id: new ObjectID() } };

    await EventHistoryHelper.createEventHistoryOnUpdate(payload, event, credentials);

    sinon.assert.calledWithExactly(
      formatHistoryForAuxiliaryUpdate,
      {
        company: credentials.company._id,
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
      event,
      credentials.company._id
    );
    sinon.assert.called(save);
    sinon.assert.notCalled(formatHistoryForDatesUpdate);
    sinon.assert.notCalled(formatHistoryForCancelUpdate);
    sinon.assert.notCalled(formatHistoryForHoursUpdate);
  });
});

describe('formatHistoryForAuxiliaryUpdate', () => {
  let UserMock;
  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should format event history when auxiliary is updated', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = { auxiliary: 'qwertyuiop' };
    const event = { auxiliary: auxiliaryId };

    UserMock.expects('find')
      .withExactArgs({ _id: { $in: [auxiliaryId, 'qwertyuiop'] } })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns([{ _id: auxiliaryId, sector: sectorId }]);

    const result = await EventHistoryHelper.formatHistoryForAuxiliaryUpdate(mainInfo, payload, event, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: {
        auxiliary: { from: auxiliaryId.toHexString(), to: 'qwertyuiop' },
      },
      sectors: [sectorId],
      auxiliaries: [auxiliaryId.toHexString(), 'qwertyuiop'],
    });
    UserMock.verify();
  });

  it('should format event history when auxiliary is removed (Unassign)', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = { sector: sectorId.toHexString() };
    const event = { auxiliary: auxiliaryId };

    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });
    const result = await EventHistoryHelper.formatHistoryForAuxiliaryUpdate(mainInfo, payload, event, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: { auxiliary: { from: auxiliaryId.toHexString() } },
      sectors: [sectorId.toHexString()],
      auxiliaries: [auxiliaryId.toHexString()],
    });
    UserMock.verify();
  });

  it('should format event history when auxiliary is added (Assign)', async () => {
    const sectorId = new ObjectID();
    const eventSectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = { auxiliary: auxiliaryId.toHexString() };
    const event = { sector: eventSectorId };

    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });
    const result = await EventHistoryHelper.formatHistoryForAuxiliaryUpdate(mainInfo, payload, event, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: {
        auxiliary: { to: auxiliaryId.toHexString() },
      },
      sectors: [sectorId.toHexString(), eventSectorId.toHexString()],
      auxiliaries: [auxiliaryId.toHexString()],
    });
  });
});

describe('formatHistoryForCancelUpdate', () => {
  let UserMock;
  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should format event history with one auxiliary', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      cancel: { reason: 'toto', condition: 'tata' },
      auxiliary: auxiliaryId.toHexString(),
    };
    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });

    const result = await EventHistoryHelper.formatHistoryForCancelUpdate(mainInfo, payload, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId.toHexString()],
      auxiliaries: [auxiliaryId.toHexString()],
      event: {
        type: 'intervention',
        auxiliary: auxiliaryId.toHexString(),
      },
      update: {
        cancel: { reason: 'toto', condition: 'tata' },
      },
    });
    UserMock.verify();
  });

  it('should format event history without auxiliary', async () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      cancel: { reason: 'toto', condition: 'tata' },
      sector: '5d3aba5866ec0f0e97cd0320',
    };

    UserMock.expects('findOne').never();

    const result = await EventHistoryHelper.formatHistoryForCancelUpdate(mainInfo, payload);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: ['5d3aba5866ec0f0e97cd0320'],
      event: { type: 'intervention' },
      update: {
        cancel: { reason: 'toto', condition: 'tata' },
      },
    });
    UserMock.verify();
  });
});

describe('formatHistoryForDatesUpdate', () => {
  let UserMock;
  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should format event history with one auxiliary', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      auxiliary: auxiliaryId.toHexString(),
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };

    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });

    const result = await EventHistoryHelper.formatHistoryForDatesUpdate(mainInfo, payload, event, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId.toHexString()],
      auxiliaries: [auxiliaryId.toHexString()],
      event: { type: 'intervention', auxiliary: auxiliaryId.toHexString() },
      update: {
        startDate: { from: '2019-01-21T09:38:18', to: '2019-01-20T09:38:18' },
      },
    });
    UserMock.verify();
  });

  it('should format event history without auxiliary', async () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-20T11:38:18',
      sector: '5d3aba5866ec0f0e97cd031f',
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };

    UserMock.expects('findOne').never();

    const result = await EventHistoryHelper.formatHistoryForDatesUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: ['5d3aba5866ec0f0e97cd031f'],
      event: { type: 'intervention' },
      update: {
        startDate: { from: '2019-01-21T09:38:18', to: '2019-01-20T09:38:18' },
      },
    });
  });

  it('should format event history with endDate and startDate', async () => {
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      startDate: '2019-01-20T09:38:18',
      endDate: '2019-01-21T11:38:18',
      sector: '5d3aba5866ec0f0e97cd031f',
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-22T10:38:18' };

    UserMock.expects('findOne').never();

    const result = await EventHistoryHelper.formatHistoryForDatesUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: ['5d3aba5866ec0f0e97cd031f'],
      event: { type: 'intervention' },
      update: {
        startDate: { from: '2019-01-21T09:38:18', to: '2019-01-20T09:38:18' },
        endDate: { from: '2019-01-22T10:38:18', to: '2019-01-21T11:38:18' },
      },
    });
  });
});

describe('formatHistoryForHoursUpdate', () => {
  let UserMock;
  beforeEach(() => {
    UserMock = sinon.mock(User);
  });
  afterEach(() => {
    UserMock.restore();
  });

  it('should format event history with one auxiliary', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      auxiliary: auxiliaryId.toHexString(),
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };

    UserMock.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: companyId } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns({ _id: auxiliaryId, sector: sectorId });

    UserMock.expects('findOne').never();
    const result = await EventHistoryHelper.formatHistoryForHoursUpdate(mainInfo, payload, event, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId.toHexString()],
      auxiliaries: [auxiliaryId.toHexString()],
      event: {
        type: 'intervention',
        auxiliary: auxiliaryId.toHexString(),
      },
      update: {
        startHour: { from: '2019-01-21T09:38:18', to: '2019-01-21T09:38:18' },
        endHour: { from: '2019-01-21T10:38:18', to: '2019-01-21T11:38:18' },
      },
    });
  });

  it('should format event history without auxiliary', async () => {
    const sectorId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      sector: sectorId.toHexString(),
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };

    UserMock.expects('findOne').never();

    const result = await EventHistoryHelper.formatHistoryForHoursUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId.toHexString()],
      event: { type: 'intervention' },
      update: {
        startHour: { from: '2019-01-21T09:38:18', to: '2019-01-21T09:38:18' },
        endHour: { from: '2019-01-21T10:38:18', to: '2019-01-21T11:38:18' },
      },
    });
  });
});
