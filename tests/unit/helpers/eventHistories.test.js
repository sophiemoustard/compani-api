const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const omit = require('lodash/omit');
const UtilsHelper = require('../../../src/helpers/utils');
const EventHistoryHelper = require('../../../src/helpers/eventHistories');
const EventHistoryRepository = require('../../../src/repositories/EventHistoryRepository');
const EventHistory = require('../../../src/models/EventHistory');
const User = require('../../../src/models/User');
const { INTERNAL_HOUR, INTERVENTION, EVENT_CREATION, EVENT_DELETION } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('list', () => {
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
    paginateStub.returns([{ type: INTERNAL_HOUR }]);

    const result = await EventHistoryHelper.list(query, credentials);

    expect(result).toEqual([{ type: INTERNAL_HOUR }]);
    sinon.assert.calledOnceWithExactly(getListQueryStub, query, credentials);
    sinon.assert.calledOnceWithExactly(paginateStub, listQuery, 20);
  });

  it('should get event histories for one event', async () => {
    const eventId = new ObjectID();
    const companyId = new ObjectID();

    const query = { eventId };
    const credentials = { company: { _id: companyId } };
    paginateStub.returns([{ type: INTERVENTION }]);

    const result = await EventHistoryHelper.list(query, credentials);

    expect(result).toEqual([{ type: INTERVENTION }]);
    sinon.assert.notCalled(getListQueryStub);
    sinon.assert.calledOnceWithExactly(paginateStub, { 'event.eventId': eventId, company: companyId });
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
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const result = EventHistoryHelper.getListQuery({}, credentials);

    expect(result).toEqual({ company: companyId });
  });

  it('should format query with sectors', () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const query = { sectors: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({ company: companyId, $or: [{ sectors: 'toto' }, { sectors: 'tata' }] });
  });

  it('should format query with auxiliaries', () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const query = { auxiliaries: ['toto', 'tata'] };
    formatArrayOrStringQueryParam.returns([{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({ company: companyId, $or: [{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }] });
  });

  it('should format query with createdAt', () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const query = { createdAt: '2019-10-11' };
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({ company: companyId, createdAt: { $lt: '2019-10-11' } });
  });

  it('should format query with action', () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const query = { action: [EVENT_CREATION, EVENT_DELETION] };
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({ company: companyId, action: { $in: [EVENT_CREATION, EVENT_DELETION] } });
  });

  it('should format query with sectors and auxiliaries and createdAt', () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const query = { sectors: ['toto', 'tata'], auxiliaries: ['toto', 'tata'], createdAt: '2019-10-11' };
    formatArrayOrStringQueryParam.onCall(0).returns([{ sectors: 'toto' }, { sectors: 'tata' }]);
    formatArrayOrStringQueryParam.onCall(1).returns([{ auxiliaries: 'toto' }, { auxiliaries: 'tata' }]);
    const result = EventHistoryHelper.getListQuery(query, credentials);

    expect(result).toEqual({
      company: companyId,
      createdAt: { $lt: '2019-10-11' },
      $or: [{ sectors: 'toto' }, { sectors: 'tata' }, { auxiliaries: 'toto' }, { auxiliaries: 'tata' }],
    });
  });
});

describe('createEventHistory', () => {
  let create;
  let findOne;
  beforeEach(() => {
    create = sinon.stub(EventHistory, 'create');
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    create.restore();
    findOne.restore();
  });

  it('should save event history with auxiliary in payload', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const payload = { _id: new ObjectID(), auxiliary: auxiliaryId.toHexString() };
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };
    findOne.returns(SinonMongoose.stubChainedQueries([{ sector: sectorId }]));

    await EventHistoryHelper.createEventHistory(payload, credentials, 'event_creation');

    sinon.assert.calledWithExactly(
      create,
      {
        createdBy: credentials._id,
        action: 'event_creation',
        company: companyId,
        auxiliaries: [auxiliaryId.toHexString()],
        sectors: [sectorId.toHexString()],
        event: { eventId: payload._id, auxiliary: auxiliaryId.toHexString() },
      }
    );
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: payload.auxiliary }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should save event history with sector in payload', async () => {
    const companyId = new ObjectID();
    const sectorId = new ObjectID();
    const payload = { _id: new ObjectID(), sector: sectorId.toHexString(), type: 'intervention' };
    const credentials = { _id: new ObjectID(), company: { _id: companyId } };

    await EventHistoryHelper.createEventHistory(payload, credentials, 'event_creation');

    sinon.assert.calledWithExactly(
      create,
      {
        createdBy: credentials._id,
        action: 'event_creation',
        company: companyId,
        sectors: [sectorId.toHexString()],
        event: { eventId: payload._id, type: 'intervention' },
      }
    );
    sinon.assert.notCalled(findOne);
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
  const customerId = new ObjectID();
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
      _id: new ObjectID(),
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      startDate: '2019-01-22T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      startDate: '2019-01-21T10:38:18',
      endDate: '2019-01-21T11:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-20T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-20T09:38:18',
          endDate: '2019-01-21T11:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'intervention',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: INTERNAL_HOUR,
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: customerId,
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
      _id: new ObjectID(),
      auxiliary: new ObjectID(),
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-22T09:38:18',
      customer: customerId,
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
          eventId: event._id,
          type: 'absence',
          startDate: '2019-01-21T09:38:18',
          endDate: '2019-01-22T09:38:18',
          customer: customerId,
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
  let find;
  let findOne;
  beforeEach(() => {
    find = sinon.stub(User, 'find');
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    find.restore();
    findOne.restore();
  });

  it('should format event history when auxiliary is updated', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = { auxiliary: 'qwertyuiop' };
    const event = { auxiliary: auxiliaryId };
    find.returns(SinonMongoose.stubChainedQueries([[{ _id: auxiliaryId, sector: sectorId }]]));

    const result = await EventHistoryHelper.formatHistoryForAuxiliaryUpdate(mainInfo, payload, event, companyId);

    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: { auxiliary: { from: auxiliaryId, to: 'qwertyuiop' } },
      sectors: [sectorId],
      auxiliaries: [auxiliaryId, 'qwertyuiop'],
    });
    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ _id: { $in: [auxiliaryId, 'qwertyuiop'] } }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
    sinon.assert.notCalled(findOne);
  });

  it('should format event history when auxiliary is removed (Unassign)', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = { sector: sectorId };
    const event = { auxiliary: auxiliaryId };
    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

    const result = await EventHistoryHelper.formatHistoryForAuxiliaryUpdate(mainInfo, payload, event, companyId);

    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: { auxiliary: { from: auxiliaryId } },
      sectors: [sectorId],
      auxiliaries: [auxiliaryId],
    });
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
    sinon.assert.notCalled(find);
  });

  it('should format event history when auxiliary is added (Assign)', async () => {
    const sectorId = new ObjectID();
    const eventSectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = { auxiliary: auxiliaryId };
    const event = { sector: eventSectorId };
    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

    const result = await EventHistoryHelper.formatHistoryForAuxiliaryUpdate(mainInfo, payload, event, companyId);

    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
      update: { auxiliary: { to: auxiliaryId } },
      sectors: [sectorId, eventSectorId],
      auxiliaries: [auxiliaryId],
    });
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
    sinon.assert.notCalled(find);
  });
});

describe('formatHistoryForCancelUpdate', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
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
    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

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
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId.toHexString() }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should format event history without auxiliary', async () => {
    const sectorId = new ObjectID();
    const mainInfo = {
      createdBy: 'james bond',
      action: 'event_update',
      event: { type: 'intervention' },
    };
    const payload = {
      cancel: { reason: 'toto', condition: 'tata' },
      sector: sectorId,
    };

    const result = await EventHistoryHelper.formatHistoryForCancelUpdate(mainInfo, payload);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId],
      event: { type: 'intervention' },
      update: {
        cancel: { reason: 'toto', condition: 'tata' },
      },
    });
    sinon.assert.notCalled(findOne);
  });
});

describe('formatHistoryForDatesUpdate', () => {
  const sectorId = new ObjectID();
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should format event history with one auxiliary', async () => {
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
    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

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
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId.toHexString() }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should format event history without auxiliary', async () => {
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = { startDate: '2019-01-20T09:38:18', endDate: '2019-01-20T11:38:18', sector: sectorId };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };

    const result = await EventHistoryHelper.formatHistoryForDatesUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId],
      event: { type: 'intervention' },
      update: {
        startDate: { from: '2019-01-21T09:38:18', to: '2019-01-20T09:38:18' },
      },
    });
    sinon.assert.notCalled(findOne);
  });

  it('should format event history with endDate and startDate', async () => {
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = { startDate: '2019-01-20T09:38:18', endDate: '2019-01-21T11:38:18', sector: sectorId };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-22T10:38:18' };

    const result = await EventHistoryHelper.formatHistoryForDatesUpdate(mainInfo, payload, event);

    expect(result).toBeDefined();
    expect(result).toEqual({
      createdBy: 'james bond',
      action: 'event_update',
      sectors: [sectorId],
      event: { type: 'intervention' },
      update: {
        startDate: { from: '2019-01-21T09:38:18', to: '2019-01-20T09:38:18' },
        endDate: { from: '2019-01-22T10:38:18', to: '2019-01-21T11:38:18' },
      },
    });
    sinon.assert.notCalled(findOne);
  });
});

describe('formatHistoryForHoursUpdate', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should format event history with one auxiliary', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const companyId = new ObjectID();
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      auxiliary: auxiliaryId.toHexString(),
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };
    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: auxiliaryId, sector: sectorId }]));

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
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: auxiliaryId.toHexString() }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id sector', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should format event history without auxiliary', async () => {
    const sectorId = new ObjectID();
    const mainInfo = { createdBy: 'james bond', action: 'event_update', event: { type: 'intervention' } };
    const payload = {
      startDate: '2019-01-21T09:38:18',
      endDate: '2019-01-21T11:38:18',
      sector: sectorId.toHexString(),
    };
    const event = { startDate: '2019-01-21T09:38:18', endDate: '2019-01-21T10:38:18' };

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
    sinon.assert.notCalled(findOne);
  });
});

describe('createTimeStampHistory', () => {
  let create;

  beforeEach(() => { create = sinon.stub(EventHistory, 'create'); });

  afterEach(() => { create.restore(); });

  it('should create and event history of type timestamp for startDate', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2021-05-01T10:00:00',
      endDate: '2021-05-01T12:00:00',
      customer: new ObjectID(),
      misc: 'test',
      company: new ObjectID(),
      repetition: { frequency: 'every_day', parentID: new ObjectID() },
    };
    const payload = { startDate: '2021-05-01T10:02:00', reason: 'qrcode', action: 'manual_time_stamping' };
    const credentials = { _id: new ObjectID() };

    await EventHistoryHelper.createTimeStampHistory(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        event: { ...omit(event, ['_id']), eventId: event._id, startDate: '2021-05-01T10:02:00' },
        company: event.company,
        action: 'manual_time_stamping',
        manualTimeStampingReason: 'qrcode',
        auxiliaries: [event.auxiliary],
        update: { startHour: { from: '2021-05-01T10:00:00', to: '2021-05-01T10:02:00' } },
        createdBy: credentials._id,
      }
    );
  });

  it('should create and event history of type timestamp for endDate', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2021-05-01T10:00:00',
      endDate: '2021-05-01T12:00:00',
      customer: new ObjectID(),
      misc: 'test',
      company: new ObjectID(),
      repetition: { frequency: 'every_day', parentID: new ObjectID() },
    };
    const payload = { endDate: '2021-05-01T12:05:00', reason: 'qrcode', action: 'manual_time_stamping' };
    const credentials = { _id: new ObjectID() };

    await EventHistoryHelper.createTimeStampHistory(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        event: { ...omit(event, ['_id']), eventId: event._id, endDate: '2021-05-01T12:05:00' },
        company: event.company,
        action: 'manual_time_stamping',
        manualTimeStampingReason: 'qrcode',
        auxiliaries: [event.auxiliary],
        update: { endHour: { from: '2021-05-01T12:00:00', to: '2021-05-01T12:05:00' } },
        createdBy: credentials._id,
      }
    );
  });

  it('shouldn’t add manualTimeStampingReason to query if reason isn’t in payload', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2021-05-01T10:00:00',
      endDate: '2021-05-01T12:00:00',
      customer: new ObjectID(),
      misc: 'test',
      company: new ObjectID(),
      repetition: { frequency: 'every_day', parentID: new ObjectID() },
    };
    const payload = { endDate: '2021-05-01T12:05:00', action: 'qr_code_time_stamping' };
    const credentials = { _id: new ObjectID() };

    await EventHistoryHelper.createTimeStampHistory(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        event: { ...omit(event, ['_id']), eventId: event._id, endDate: '2021-05-01T12:05:00' },
        company: event.company,
        action: 'qr_code_time_stamping',
        auxiliaries: [event.auxiliary],
        update: { endHour: { from: '2021-05-01T12:00:00', to: '2021-05-01T12:05:00' } },
        createdBy: credentials._id,
      }
    );
  });
});

describe('update', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(EventHistory, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update an event history', async () => {
    const payload = { isCancelled: true };
    const eventHistoryId = new ObjectID();

    await EventHistoryHelper.update(eventHistoryId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: eventHistoryId }, { $set: { isCancelled: true } });
  });
});
