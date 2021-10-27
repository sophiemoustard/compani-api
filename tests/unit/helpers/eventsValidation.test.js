const expect = require('expect');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const EventHistory = require('../../../src/models/EventHistory');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const EventRepository = require('../../../src/repositories/EventRepository');
const { INTERVENTION, ABSENCE, INTERNAL_HOUR, UNAVAILABILITY } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('isCustomerSubscriptionValid', () => {
  let countDocuments;
  beforeEach(() => {
    countDocuments = sinon.stub(Customer, 'countDocuments');
  });
  afterEach(() => {
    countDocuments.restore();
  });

  it('should return true if event subscription is in customer subscriptions', async () => {
    const subscriptionId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    countDocuments.returns(1);

    const result = await EventsValidationHelper.isCustomerSubscriptionValid(event);

    expect(result).toBe(true);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      {
        _id: event.customer,
        'subscriptions._id': event.subscription,
        $or: [{ stoppedAt: { $exists: false } }, { stoppedAt: { $gte: event.startDate } }],
      }
    );
  });

  it('should return false if event subscription is not in customer subscriptions', async () => {
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: (new ObjectID()).toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
    };

    countDocuments.returns(0);

    const result = await EventsValidationHelper.isCustomerSubscriptionValid(event);

    expect(result).toBe(false);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      {
        _id: event.customer,
        'subscriptions._id': event.subscription,
        $or: [{ stoppedAt: { $exists: false } }, { stoppedAt: { $gte: event.startDate } }],
      }
    );
  });
});

describe('isUserContractValidOnEventDates', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(User, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return false as user has no contract', async () => {
    const event = { auxiliary: (new ObjectID()).toHexString() };
    const user = { _id: event.auxiliary };

    findOne.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false as user contracts are empty', async () => {
    const event = { auxiliary: (new ObjectID()).toHexString() };
    const user = { _id: event.auxiliary, contracts: [] };

    findOne.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false if contract and no active contract on day and event not absence', async () => {
    const event = { auxiliary: new ObjectID(), startDate: '2020-04-30T09:00:00', type: INTERVENTION };
    const contract = { user: event.auxiliary, startDate: '2020-12-05T00:00:00' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return true if contract and active contract on day and event not absence', async () => {
    const event = { auxiliary: new ObjectID(), startDate: '2020-04-30T09:00:00', type: INTERNAL_HOUR };
    const contract = { user: event.auxiliary, startDate: '2020-01-04T00:00:00' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false if contract and no active contract on day and event is absence', async () => {
    const event = {
      auxiliary: new ObjectID(),
      startDate: '2020-04-30T09:00:00',
      endDate: '2020-05-12T23:25:59',
      type: ABSENCE,
    };
    const contract = { user: event.auxiliary, startDate: '2020-05-04T00:00:00' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return true if contract and active contract on day and event is absence', async () => {
    const event = {
      auxiliary: new ObjectID(),
      startDate: '2020-04-30T09:00:00',
      endDate: '2020-05-12T23:25:59',
      type: ABSENCE,
    };
    const contract = { user: event.auxiliary, startDate: '2020-01-04T00:00:00' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries([user]));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });
});

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

    getAuxiliaryEventsBetweenDates.returns([{
      _id: new ObjectID(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T12:00:00.000Z',
      isCancelled: true,
    }]);
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
      company: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([{
      _id: new ObjectID(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T12:00:00.000Z',
      type: ABSENCE,
    }]);

    await EventsValidationHelper.hasConflicts(event);

    sinon.assert.calledWithExactly(
      getAuxiliaryEventsBetweenDates,
      auxiliaryId,
      '2019-10-02T09:00:00.000Z',
      '2019-10-02T11:00:00.000Z',
      event.company,
      ABSENCE
    );
  });
});

describe('isEditionAllowed', () => {
  let isUserContractValidOnEventDates;
  let isCustomerSubscriptionValid;
  beforeEach(() => {
    isUserContractValidOnEventDates = sinon.stub(EventsValidationHelper, 'isUserContractValidOnEventDates');
    isCustomerSubscriptionValid = sinon.stub(EventsValidationHelper, 'isCustomerSubscriptionValid');
  });
  afterEach(() => {
    isUserContractValidOnEventDates.restore();
    isCustomerSubscriptionValid.restore();
  });

  it('should return false as event is not absence and not on one day', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-14T11:00:00',
    };

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(isUserContractValidOnEventDates);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false as event has no auxiliary and is not intervention', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const event = {
      sector: (new ObjectID()).toHexString(),
      type: ABSENCE,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(isUserContractValidOnEventDates);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false as auxiliary does not have contracts', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    isUserContractValidOnEventDates.returns(false);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false if event is intervention and customer subscription is not valid', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    isUserContractValidOnEventDates.returns(true);
    isCustomerSubscriptionValid.returns(false);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.calledWithExactly(isCustomerSubscriptionValid, event);
  });

  it('should return true if event is intervention and customer subscription is valid', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    isUserContractValidOnEventDates.returns(true);
    isCustomerSubscriptionValid.returns(true);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.calledWithExactly(isCustomerSubscriptionValid, event);
  });

  it('should return true', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const event = {
      auxiliary: new ObjectID().toHexString(),
      type: INTERNAL_HOUR,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    isUserContractValidOnEventDates.returns(true);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });
});

describe('isCreationAllowed', () => {
  let hasConflicts;
  let isEditionAllowed;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    isEditionAllowed = sinon.stub(EventsValidationHelper, 'isEditionAllowed');
  });
  afterEach(() => {
    hasConflicts.restore();
    isEditionAllowed.restore();
  });

  it('should return 409 as event is not absence and has conflicts', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    hasConflicts.returns(true);
    try {
      await EventsValidationHelper.isCreationAllowed(event, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('Evènement en conflit avec les évènements de l\'auxiliaire.');
    } finally {
      sinon.assert.notCalled(isEditionAllowed);
      sinon.assert.calledWithExactly(hasConflicts, event);
    }
  });

  it('should return true', async () => {
    const companyId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectID();
    const event = {
      auxiliary: auxiliaryId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    hasConflicts.returns(false);
    isEditionAllowed.returns(true);

    const isValid = await EventsValidationHelper.isCreationAllowed(event, credentials);

    expect(isValid).toBeTruthy();
    sinon.assert.calledWithExactly(isEditionAllowed, event, credentials);
    sinon.assert.calledWithExactly(hasConflicts, event);
  });

  it('should return true as there is no conflict when no auxiliary assigned', async () => {
    const companyId = new ObjectID();
    const sectorId = new ObjectID();
    const credentials = { company: { _id: companyId } };
    const event = {
      sector: sectorId.toHexString(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };

    isEditionAllowed.returns(true);

    const isValid = await EventsValidationHelper.isCreationAllowed(event, credentials);

    expect(isValid).toBeTruthy();
    sinon.assert.calledWithExactly(isEditionAllowed, event, credentials);
    sinon.assert.notCalled(hasConflicts);
  });
});

describe('isUpdateAllowed', () => {
  let isEditionAllowed;
  let hasConflicts;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    isEditionAllowed = sinon.stub(EventsValidationHelper, 'isEditionAllowed');
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
  });
  afterEach(() => {
    isEditionAllowed.restore();
    hasConflicts.restore();
  });

  it('should return true if everything is ok', async () => {
    const auxiliaryId = new ObjectID();
    const payload = { startDate: '2019-04-13T09:00:00', endDate: '2019-04-13T11:00:00' };
    const eventFromDB = { auxiliary: auxiliaryId, type: INTERVENTION, repetition: { frequency: 'every_week' } };
    hasConflicts.returns(false);
    isEditionAllowed.returns(true);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeTruthy();
    sinon.assert.calledOnceWithExactly(
      hasConflicts,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00',
        endDate: '2019-04-13T11:00:00',
        repetition: { frequency: 'every_week' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      isEditionAllowed,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00',
        endDate: '2019-04-13T11:00:00',
        repetition: { frequency: 'every_week' },
      },
      credentials
    );
  });

  it('should return false if event is startDate timeStamped and start date updated', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:05:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      startDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is startDate timeStamped and auxiliary updated', async () => {
    const payload = { auxiliary: new ObjectID(), startDate: '2019-04-13T09:00:00', endDate: '2019-04-13T11:00:00' };
    const eventFromDB = {
      auxiliary: new ObjectID(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      startDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is startDate timeStamped and user cancels event', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      isCancelled: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      startDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is endDate timeStamped and end date updated', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:05:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      endDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is endDate timeStamped and auxiliary updated', async () => {
    const payload = { auxiliary: new ObjectID(), startDate: '2019-04-13T09:00:00', endDate: '2019-04-13T11:00:00' };
    const eventFromDB = {
      auxiliary: new ObjectID(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      endDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is endDate timeStamped and user cancels event', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      isCancelled: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      endDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is billed', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      endDateTimeStamp: 1,
    };
    const eventFromDB = { auxiliary: auxiliaryId, type: INTERVENTION, isBilled: true };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false as event is absence and auxiliary is updated', async () => {
    const payload = {
      auxiliary: (new ObjectID()).toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      endDateTimeStamp: 1,
      auxiliary: new ObjectID(),
      type: ABSENCE,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false as event is unavailability and auxiliary is updated', async () => {
    const payload = {
      auxiliary: (new ObjectID()).toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      endDateTimeStamp: 1,
      auxiliary: new ObjectID(),
      type: UNAVAILABILITY,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should throw 409 if event has auxiliairy, is single intervention not cancelled and has conflicts', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = { auxiliary: auxiliaryId, type: INTERVENTION };
    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(
        hasConflicts,
        {
          auxiliary: auxiliaryId.toHexString(),
          startDate: '2019-04-13T09:00:00',
          endDate: '2019-04-13T11:00:00',
          type: INTERVENTION,
        }
      );
      sinon.assert.notCalled(isEditionAllowed);
    }
  });

  it('should throw 409 if event has auxiliairy, has conflicts and cancellation is undone', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      isCancelled: false,
      'repetition.frequency': 'never',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isCancelled: true,
      repetition: { frequency: 'every_week' },
    };
    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(
        hasConflicts,
        {
          auxiliary: auxiliaryId.toHexString(),
          startDate: '2019-04-13T09:00:00',
          endDate: '2019-04-13T11:00:00',
          type: INTERVENTION,
          isCancelled: false,
          repetition: { frequency: 'never' },
        }
      );
      sinon.assert.notCalled(isEditionAllowed);
    }
  });

  it('should return false if edition is not allowed', async () => {
    const auxiliaryId = new ObjectID();
    const payload = { startDate: '2019-04-13T09:00:00', endDate: '2019-04-13T11:00:00' };
    const eventFromDB = { auxiliary: auxiliaryId, type: INTERVENTION, repetition: { frequency: 'every_week' } };
    hasConflicts.returns(false);
    isEditionAllowed.returns(false);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.calledOnceWithExactly(
      hasConflicts,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00',
        endDate: '2019-04-13T11:00:00',
        repetition: { frequency: 'every_week' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      isEditionAllowed,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00',
        endDate: '2019-04-13T11:00:00',
        repetition: { frequency: 'every_week' },
      },
      credentials
    );
  });
});

describe('checkDeletionIsAllowed', () => {
  let eventHistoryCountDocuments;
  beforeEach(() => {
    eventHistoryCountDocuments = sinon.stub(EventHistory, 'countDocuments');
  });
  afterEach(() => {
    eventHistoryCountDocuments.restore();
  });

  it('should return nothing if events are not interventions', async () => {
    const events = [{ _id: new ObjectID(), type: INTERNAL_HOUR, isBilled: true }];

    eventHistoryCountDocuments.returns(0);

    await EventsValidationHelper.checkDeletionIsAllowed(events);

    sinon.assert.calledOnceWithExactly(
      eventHistoryCountDocuments, {
        'event.eventId': { $in: events.map(event => event._id) },
        'event.type': INTERVENTION,
        action: { $in: EventHistory.TIME_STAMPING_ACTIONS },
      }
    );
  });

  it('should return nothing if events are not billed and not timestamped', async () => {
    const events = [{ _id: new ObjectID(), type: INTERVENTION, isBilled: false }];

    eventHistoryCountDocuments.returns(0);

    await EventsValidationHelper.checkDeletionIsAllowed(events);

    sinon.assert.calledOnceWithExactly(
      eventHistoryCountDocuments, {
        'event.eventId': { $in: events.map(event => event._id) },
        'event.type': INTERVENTION,
        action: { $in: EventHistory.TIME_STAMPING_ACTIONS },
      }
    );
  });

  it('should return conflict if at least one event is a billed intervention', async () => {
    const events = [
      { _id: new ObjectID(), type: INTERVENTION, isBilled: true },
      { _id: new ObjectID(), type: INTERVENTION, isBilled: false },
    ];
    try {
      await EventsValidationHelper.checkDeletionIsAllowed(events);

      expect(false).toBe(true);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Vous ne pouvez pas supprimer un évènement facturé.'));
    } finally {
      sinon.assert.notCalled(eventHistoryCountDocuments);
    }
  });

  it('should return conflict if at least one event is a timestamped intervention', async () => {
    const events = [
      { _id: new ObjectID(), type: INTERVENTION, isBilled: false },
      { _id: new ObjectID(), type: INTERVENTION, isBilled: false },
    ];

    eventHistoryCountDocuments.returns(1);

    try {
      await EventsValidationHelper.checkDeletionIsAllowed(events);

      expect(false).toBe(true);
    } catch (e) {
      expect(e).toEqual(Boom.conflict('Vous ne pouvez pas supprimer un évènement horodaté.'));
    } finally {
      sinon.assert.calledOnceWithExactly(
        eventHistoryCountDocuments, {
          'event.eventId': { $in: events.map(event => event._id) },
          'event.type': INTERVENTION,
          action: { $in: EventHistory.TIME_STAMPING_ACTIONS },
        }
      );
    }
  });
});
