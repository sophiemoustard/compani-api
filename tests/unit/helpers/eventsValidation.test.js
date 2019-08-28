const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const User = require('../../../models/User');
const EventHelper = require('../../../helpers/events');
const EventsValidationHelper = require('../../../helpers/eventsValidation');
const EventRepository = require('../../../repositories/EventRepository');
const {
  INTERVENTION,
  ABSENCE,
} = require('../../../helpers/constants');

require('sinon-mongoose');

describe('hasConflicts', () => {
  let getAuxiliaryEventsBetweenDates;
  beforeEach(() => {
    getAuxiliaryEventsBetweenDates = sinon.stub(EventRepository, 'getAuxiliaryEventsBetweenDates');
  });
  afterEach(() => {
    getAuxiliaryEventsBetweenDates.restore();
  });

  it('should return true if event has conflicts', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeTruthy();
  });

  it('should return false if event does not have conflicts', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T15:00:00.000Z',
      endDate: '2019-10-02T16:00:00.000Z',
      auxiliary: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: event._id, startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should return false if event has conflicts only with cancelled events', async () => {
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z', isCancelled: true },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should only check conflicts with absence when absence is created', async () => {
    const auxiliaryId = new ObjectID();
    const event = {
      _id: new ObjectID(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: auxiliaryId,
      type: ABSENCE,
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z', type: ABSENCE },
    ]);

    await EventsValidationHelper.hasConflicts(event);

    sinon.assert.calledWith(getAuxiliaryEventsBetweenDates, auxiliaryId, '2019-10-02T09:00:00.000Z', '2019-10-02T11:00:00.000Z', ABSENCE);
  });
});

describe('isCreationAllowed', () => {
  let UserModel;
  let checkContracts;
  let hasConflicts;
  beforeEach(() => {
    UserModel = sinon.mock(User);
    checkContracts = sinon.stub(EventHelper, 'checkContracts');
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
  });
  afterEach(() => {
    UserModel.restore();
    checkContracts.restore();
    hasConflicts.restore();
  });

  it('should return false as event is not absence and not on one day', async () => {
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      sector: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-14T11:00:00',
    };
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(checkContracts);
    sinon.assert.notCalled(hasConflicts);
  });

  it('should return false as event has no auxiliary and is not intervention', async () => {
    const event = {
      sector: (new ObjectID()).toHexString(),
      type: ABSENCE,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(checkContracts);
  });

  it('should return true as event has no auxiliary and is intervention', async () => {
    const event = {
      sector: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeTruthy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(checkContracts);
  });

  it('should return false as auxiliary does not have contracts', async () => {
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      sector: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const user = { _id: auxiliaryId, sector: new ObjectID() };

    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    checkContracts.returns(false);
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.calledWith(checkContracts, event, user);
  });

  it('should return false as event is not absence and has conflicts', async () => {
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      sector: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const user = { _id: event.auxiliary, sector: new ObjectID() };

    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    checkContracts.returns(true);
    hasConflicts.returns(true);
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.calledWith(hasConflicts, event);
    sinon.assert.calledWith(checkContracts, event, user);
  });

  it('should return false if auxiliary sector is not event sector', async () => {
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      sector: new ObjectID().toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const user = { _id: auxiliaryId, sector: new ObjectID() };

    checkContracts.returns(true);
    hasConflicts.returns(false);
    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.calledWith(hasConflicts, event);
    sinon.assert.calledWith(checkContracts, event, user);
  });

  it('should return true', async () => {
    const auxiliaryId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const user = { _id: auxiliaryId, sector: sectorId };

    checkContracts.returns(true);
    hasConflicts.returns(false);
    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    const result = await EventsValidationHelper.isCreationAllowed(event);

    UserModel.verify();
    expect(result).toBeTruthy();
    sinon.assert.calledWith(hasConflicts, event);
    sinon.assert.calledWith(checkContracts, event, user);
  });
});

describe('isEditionAllowed', () => {
  let UserModel;
  let checkContracts;
  let hasConflicts;
  beforeEach(() => {
    UserModel = sinon.mock(User);
    checkContracts = sinon.stub(EventHelper, 'checkContracts');
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
  });
  afterEach(() => {
    UserModel.restore();
    checkContracts.restore();
    hasConflicts.restore();
  });

  it('should return false as event is billed', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isBilled: true,
    };
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(checkContracts);
    sinon.assert.notCalled(hasConflicts);
  });

  it('should return false as event is absence or availability and auxiliary is updated', async () => {
    const sectorId = new ObjectID();
    const payload = {
      auxiliary: (new ObjectID()).toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: new ObjectID(),
      type: ABSENCE,
    };
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(checkContracts);
    sinon.assert.notCalled(hasConflicts);
  });

  it('should return false as event is not absence and no on one day', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-14T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isBilled: true,
    };
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(checkContracts);
    sinon.assert.notCalled(hasConflicts);
  });

  it('should return false as event has no auxiliary and is not intervention', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: ABSENCE,
    };
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(checkContracts);
  });

  it('should return true as event has no auxiliary and is intervention', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeTruthy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(checkContracts);
  });

  it('should return false as auxiliary does not have contracts', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };
    const user = { _id: auxiliaryId, sector: sectorId };

    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    checkContracts.returns(false);
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.calledWith(checkContracts, { ...eventFromDB, ...payload }, user);
  });

  it('should return false as event is not absence and has conflicts', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };
    const user = { _id: auxiliaryId, sector: sectorId };

    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    checkContracts.returns(true);
    hasConflicts.returns(true);
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.calledWith(hasConflicts, { ...eventFromDB, ...payload });
    sinon.assert.calledWith(checkContracts, { ...eventFromDB, ...payload }, user);
  });

  it('should return false if auxiliary sector is not event sector', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: (new ObjectID()).toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };
    const user = { _id: auxiliaryId, sector: new ObjectID() };

    checkContracts.returns(true);
    hasConflicts.returns(false);
    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.calledWith(hasConflicts, { ...eventFromDB, ...payload });
    sinon.assert.calledWith(checkContracts, { ...eventFromDB, ...payload }, user);
  });

  it('should return true', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };
    const user = { _id: auxiliaryId, sector: sectorId };

    checkContracts.returns(true);
    hasConflicts.returns(false);
    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload);

    UserModel.verify();
    expect(result).toBeTruthy();
    sinon.assert.calledWith(hasConflicts, { ...eventFromDB, ...payload });
    sinon.assert.calledWith(checkContracts, { ...eventFromDB, ...payload }, user);
  });
});
