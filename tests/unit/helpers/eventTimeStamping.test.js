const sinon = require('sinon');
const { expect } = require('expect');
const Boom = require('@hapi/boom');
const { ObjectId } = require('mongodb');
const eventTimeStampingHelper = require('../../../src/helpers/eventTimeStamping');
const eventHistoryHelper = require('../../../src/helpers/eventHistories');
const eventValidationHelper = require('../../../src/helpers/eventsValidation');
const Event = require('../../../src/models/Event');
const { MANUAL_TIME_STAMPING } = require('../../../src/helpers/constants');

describe('isStartDateTimeStampAllowed', () => {
  let hasConflictsStub;

  beforeEach(() => { hasConflictsStub = sinon.stub(eventValidationHelper, 'hasConflicts'); });

  afterEach(() => { hasConflictsStub.restore(); });

  it('should return true if user is allowed to timestamp', async () => {
    const event = { _id: new ObjectId(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const startDate = '2021-05-01T10:04:00';

    hasConflictsStub.returns(false);

    const result = await eventTimeStampingHelper.isStartDateTimeStampAllowed(event, startDate);

    expect(result).toBe(true);
    sinon.assert.calledOnceWithExactly(hasConflictsStub, { ...event, startDate });
  });

  it('should return a 422 if endDate is before timestamping date', async () => {
    const event = { _id: new ObjectId(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const startDate = '2021-05-01T12:30:00';
    try {
      await eventTimeStampingHelper.isStartDateTimeStampAllowed(event, startDate);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.badData('Vous ne pouvez pas horodater le début d\'un évènement terminé.'));
    }
  });

  it('should return a 409 if new event is in conflict with other events', async () => {
    const event = { _id: new ObjectId(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const startDate = '2021-05-01T09:45:00';
    try {
      hasConflictsStub.returns(true);

      await eventTimeStampingHelper.isStartDateTimeStampAllowed(event, startDate);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('L\'horodatage est en conflit avec un évènement.'));
      sinon.assert.calledOnceWithExactly(hasConflictsStub, { ...event, startDate });
    }
  });
});

describe('isEndDateTimeStampAllowed', () => {
  let hasConflictsStub;

  beforeEach(() => { hasConflictsStub = sinon.stub(eventValidationHelper, 'hasConflicts'); });

  afterEach(() => { hasConflictsStub.restore(); });

  it('should return true if user is allowed to timestamp', async () => {
    const event = { _id: new ObjectId(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const endDate = '2021-05-01T12:04:00';

    hasConflictsStub.returns(false);

    const result = await eventTimeStampingHelper.isEndDateTimeStampAllowed(event, endDate);

    expect(result).toBe(true);
    sinon.assert.calledOnceWithExactly(hasConflictsStub, { ...event, endDate });
  });

  it('should return a 422 if startDate is after timestamping date', async () => {
    const event = { _id: new ObjectId(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const endDate = '2021-05-01T09:30:00';
    try {
      await eventTimeStampingHelper.isEndDateTimeStampAllowed(event, endDate);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.badData('Vous ne pouvez pas horodater la fin d\'un évènement avant son commencement.'));
    }
  });

  it('should return a 409 if new event is in conflict with other events', async () => {
    const event = { _id: new ObjectId(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const endDate = '2021-05-01T12:45:00';
    try {
      hasConflictsStub.returns(true);

      await eventTimeStampingHelper.isEndDateTimeStampAllowed(event, endDate);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('L\'horodatage est en conflit avec un évènement.'));
      sinon.assert.calledOnceWithExactly(hasConflictsStub, { ...event, endDate });
    }
  });
});

describe('addTimeStamp', () => {
  let isStartDateTimeStampAllowedStub;
  let isEndDateTimeStampAllowedStub;
  let createTimeStampHistoryStub;
  let updateOne;

  beforeEach(() => {
    isStartDateTimeStampAllowedStub = sinon.stub(eventTimeStampingHelper, 'isStartDateTimeStampAllowed');
    isEndDateTimeStampAllowedStub = sinon.stub(eventTimeStampingHelper, 'isEndDateTimeStampAllowed');
    createTimeStampHistoryStub = sinon.stub(eventHistoryHelper, 'createTimeStampHistory');
    updateOne = sinon.stub(Event, 'updateOne');
  });

  afterEach(() => {
    isStartDateTimeStampAllowedStub.restore();
    isEndDateTimeStampAllowedStub.restore();
    createTimeStampHistoryStub.restore();
    updateOne.restore();
  });

  it('should add startDate timestamp and updateEvent', async () => {
    const event = { _id: new ObjectId() };
    const startDate = new Date();
    const payload = { action: MANUAL_TIME_STAMPING, reason: 'qrcode', startDate };
    const credentials = { _id: new ObjectId() };

    isStartDateTimeStampAllowedStub.returns(true);

    await eventTimeStampingHelper.addTimeStamp(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(isStartDateTimeStampAllowedStub, event, startDate);
    sinon.assert.calledOnceWithExactly(createTimeStampHistoryStub, event, payload, credentials);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: event._id }, { startDate, 'repetition.frequency': 'never' });
    sinon.assert.notCalled(isEndDateTimeStampAllowedStub);
  });

  it('should return a 409 if startDate timestamp is not allowed', async () => {
    const event = { _id: new ObjectId() };
    const startDate = new Date();
    const payload = { action: MANUAL_TIME_STAMPING, reason: 'qrcode', startDate };
    const credentials = { _id: new ObjectId() };

    try {
      isStartDateTimeStampAllowedStub.returns(false);

      await eventTimeStampingHelper.addTimeStamp(event, payload, credentials);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Problème lors de l\'horodatage. Contactez le support technique.'));
      sinon.assert.calledOnceWithExactly(isStartDateTimeStampAllowedStub, event, startDate);
      sinon.assert.notCalled(createTimeStampHistoryStub);
      sinon.assert.notCalled(updateOne);
      sinon.assert.notCalled(isEndDateTimeStampAllowedStub);
    }
  });

  it('should add endDate timestamp and updateEvent', async () => {
    const event = { _id: new ObjectId() };
    const endDate = new Date();
    const payload = { action: MANUAL_TIME_STAMPING, reason: 'qrcode', endDate };
    const credentials = { _id: new ObjectId() };

    isEndDateTimeStampAllowedStub.returns(true);

    await eventTimeStampingHelper.addTimeStamp(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(isEndDateTimeStampAllowedStub, event, endDate);
    sinon.assert.calledOnceWithExactly(createTimeStampHistoryStub, event, payload, credentials);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: event._id }, { endDate, 'repetition.frequency': 'never' });
    sinon.assert.notCalled(isStartDateTimeStampAllowedStub);
  });

  it('should return a 409 if startDate timestamp is not allowed', async () => {
    const event = { _id: new ObjectId() };
    const endDate = new Date();
    const payload = { action: MANUAL_TIME_STAMPING, reason: 'qrcode', endDate };
    const credentials = { _id: new ObjectId() };

    try {
      isEndDateTimeStampAllowedStub.returns(false);

      await eventTimeStampingHelper.addTimeStamp(event, payload, credentials);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Problème lors de l\'horodatage. Contactez le support technique.'));
      sinon.assert.calledOnceWithExactly(isEndDateTimeStampAllowedStub, event, endDate);
      sinon.assert.notCalled(createTimeStampHistoryStub);
      sinon.assert.notCalled(updateOne);
      sinon.assert.notCalled(isStartDateTimeStampAllowedStub);
    }
  });
});
