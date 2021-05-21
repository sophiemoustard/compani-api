const sinon = require('sinon');
const expect = require('expect');
const Boom = require('@hapi/boom');
const { ObjectID } = require('mongodb');
const eventTimeStampingHelper = require('../../../src/helpers/eventTimeStamping');
const eventHistoryHelper = require('../../../src/helpers/eventHistories');
const eventValidationHelper = require('../../../src/helpers/eventsValidation');
const Event = require('../../../src/models/Event');

describe('isTimeStampAllowed', () => {
  let hasConflictsStub;

  beforeEach(() => { hasConflictsStub = sinon.stub(eventValidationHelper, 'hasConflicts'); });

  afterEach(() => { hasConflictsStub.restore(); });

  it('should return true if user is allowed to timestamp', async () => {
    const event = { _id: new ObjectID(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const startDate = '2021-05-01T10:04:00';

    hasConflictsStub.returns(false);

    const result = await eventTimeStampingHelper.isTimeStampAllowed(event, startDate);

    expect(result).toBe(true);
  });

  it('should return a 422 if endDate is before timestamping date', async () => {
    const event = { _id: new ObjectID(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const startDate = '2021-05-01T12:30:00';
    try {
      await eventTimeStampingHelper.isTimeStampAllowed(event, startDate);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.badData('Vous ne pouvez pas horodater le début d\'un évènement terminé.'));
    }
  });

  it('should return a 409 if new event is in conflict with other events', async () => {
    const event = { _id: new ObjectID(), startDate: '2021-05-01T10:00:00', endDate: '2021-05-01T12:00:00' };
    const startDate = '2021-05-01T09:45:00';
    try {
      hasConflictsStub.returns(true);

      await eventTimeStampingHelper.isTimeStampAllowed(event, startDate);

      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('L\'horodatage est en conflit avec un évènement.'));
      sinon.assert.calledOnceWithExactly(hasConflictsStub, { ...event, startDate });
    }
  });
});

describe('addTimeStamp', () => {
  let isTimeStampAllowedStub;
  let createTimeStampHistoryStub;
  let updateOne;

  beforeEach(() => {
    isTimeStampAllowedStub = sinon.stub(eventTimeStampingHelper, 'isTimeStampAllowed');
    createTimeStampHistoryStub = sinon.stub(eventHistoryHelper, 'createTimeStampHistory');
    updateOne = sinon.stub(Event, 'updateOne');
  });

  afterEach(() => {
    isTimeStampAllowedStub.restore();
    createTimeStampHistoryStub.restore();
    updateOne.restore();
  });

  it('should add timestamp and updateEvent', async () => {
    const event = { _id: new ObjectID() };
    const startDate = new Date();
    const payload = { action: 'manual_timestamping', reason: 'qrcode', startDate };
    const credentials = { _id: new ObjectID() };

    isTimeStampAllowedStub.returns(true);

    await eventTimeStampingHelper.addTimeStamp(event, payload, credentials);

    sinon.assert.calledOnceWithExactly(isTimeStampAllowedStub, event, startDate);
    sinon.assert.calledOnceWithExactly(createTimeStampHistoryStub, event, payload, credentials);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: event._id }, { startDate });
  });

  it('should return a 409 if timestamp is not allowed', async () => {
    const event = { _id: new ObjectID() };
    const startDate = new Date();
    const payload = { action: 'manual_timestamping', reason: 'qrcode', startDate };
    const credentials = { _id: new ObjectID() };

    try {
      isTimeStampAllowedStub.returns(false);

      await eventTimeStampingHelper.addTimeStamp(event, payload, credentials);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Problème lors de l\'horodatage. Contactez le support technique.'));
      sinon.assert.calledOnceWithExactly(isTimeStampAllowedStub, event, startDate);
      sinon.assert.notCalled(createTimeStampHistoryStub);
      sinon.assert.notCalled(updateOne);
    }
  });
});
