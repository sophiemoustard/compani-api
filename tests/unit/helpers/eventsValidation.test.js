const expect = require('expect');
const sinon = require('sinon');
const Boom = require('@hapi/boom');
const { ObjectId } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const EventHistory = require('../../../src/models/EventHistory');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const CustomerAbsencesHelper = require('../../../src/helpers/customerAbsences');
const EventRepository = require('../../../src/repositories/EventRepository');
const {
  INTERVENTION,
  ABSENCE,
  INTERNAL_HOUR,
  UNAVAILABILITY,
  HOURLY,
  TIME_STAMPING_ACTIONS,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');
const { CompaniDate } = require('../../../src/helpers/dates/companiDates');

describe('isCustomerSubscriptionValid', () => {
  let countDocuments;
  beforeEach(() => {
    countDocuments = sinon.stub(Customer, 'countDocuments');
  });
  afterEach(() => {
    countDocuments.restore();
  });

  it('should return true if event subscription is in customer subscriptions', async () => {
    const event = {
      auxiliary: new ObjectId(),
      customer: new ObjectId(),
      type: INTERVENTION,
      subscription: new ObjectId(),
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
      auxiliary: new ObjectId(),
      customer: new ObjectId(),
      type: INTERVENTION,
      subscription: new ObjectId(),
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
    const event = { auxiliary: new ObjectId() };
    const user = { _id: event.auxiliary };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false as user contracts are empty', async () => {
    const event = { auxiliary: new ObjectId() };
    const user = { _id: event.auxiliary, contracts: [] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return false if contract and no active contract on day and event not absence', async () => {
    const event = { auxiliary: new ObjectId(), startDate: '2020-04-30T09:00:00.000Z', type: INTERVENTION };
    const contract = { user: event.auxiliary, startDate: '2020-12-05T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.auxiliary }] },
        { query: 'populate', args: ['contracts'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return true if contract and active contract on day and event not absence', async () => {
    const event = { auxiliary: new ObjectId(), startDate: '2020-04-30T09:00:00.000Z', type: INTERNAL_HOUR };
    const contract = { user: event.auxiliary, startDate: '2020-01-04T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledOnceWithExactly(
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
      auxiliary: new ObjectId(),
      startDate: '2020-04-30T09:00:00.000Z',
      endDate: '2020-05-12T23:25:59.000Z',
      type: ABSENCE,
    };
    const contract = { user: event.auxiliary, startDate: '2020-05-04T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(false);
    SinonMongoose.calledOnceWithExactly(
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
      auxiliary: new ObjectId(),
      startDate: '2020-04-30T09:00:00.000Z',
      endDate: '2020-05-12T23:25:59.000Z',
      type: ABSENCE,
    };
    const contract = { user: event.auxiliary, startDate: '2020-01-04T00:00:00.000Z' };
    const user = { _id: event.auxiliary, contracts: [contract] };

    findOne.returns(SinonMongoose.stubChainedQueries(user));

    const result = await EventsValidationHelper.isUserContractValidOnEventDates(event);

    expect(result).toBe(true);
    SinonMongoose.calledOnceWithExactly(
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
      _id: new ObjectId(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectId(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeTruthy();
  });

  it('should return false if event does not have conflicts', async () => {
    const event = {
      _id: new ObjectId(),
      startDate: '2019-10-02T15:00:00.000Z',
      endDate: '2019-10-02T16:00:00.000Z',
      auxiliary: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: event._id, startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z' },
    ]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should return false if event has conflicts only with cancelled events', async () => {
    const event = {
      _id: new ObjectId(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([{
      _id: new ObjectId(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T12:00:00.000Z',
      isCancelled: true,
    }]);
    const result = await EventsValidationHelper.hasConflicts(event);

    expect(result).toBeFalsy();
  });

  it('should only check conflicts with absence when absence is created', async () => {
    const auxiliaryId = new ObjectId();
    const event = {
      _id: new ObjectId(),
      startDate: '2019-10-02T09:00:00.000Z',
      endDate: '2019-10-02T11:00:00.000Z',
      auxiliary: auxiliaryId,
      type: ABSENCE,
      company: new ObjectId(),
    };

    getAuxiliaryEventsBetweenDates.returns([{
      _id: new ObjectId(),
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
  let isAbsent;
  beforeEach(() => {
    isUserContractValidOnEventDates = sinon.stub(EventsValidationHelper, 'isUserContractValidOnEventDates');
    isCustomerSubscriptionValid = sinon.stub(EventsValidationHelper, 'isCustomerSubscriptionValid');
    isAbsent = sinon.stub(CustomerAbsencesHelper, 'isAbsent');
  });
  afterEach(() => {
    isUserContractValidOnEventDates.restore();
    isCustomerSubscriptionValid.restore();
    isAbsent.restore();
  });

  it('should return false as event is not absence and not on one day', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-14T11:00:00.000Z',
    };

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(isUserContractValidOnEventDates);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false as event is not a daily absence and not on one day', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: ABSENCE,
      absenceNature: HOURLY,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-14T11:00:00.000Z',
    };

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(isUserContractValidOnEventDates);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false as event has no auxiliary and is not intervention', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      sector: new ObjectId(),
      type: ABSENCE,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(isUserContractValidOnEventDates);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false as auxiliary does not have contracts', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    isUserContractValidOnEventDates.returns(false);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.notCalled(isCustomerSubscriptionValid);
  });

  it('should return false if event is intervention and customer is absent', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      customer: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    isAbsent.returns(true);

    try {
      await EventsValidationHelper.isEditionAllowed(event, credentials);
    } catch (e) {
      expect(e.output.statusCode).toBe(409);
      expect(e.output.payload.message).toBe('La personne est absente à cette date.');
    } finally {
      sinon.assert.calledOnceWithExactly(isAbsent, event.customer, event.startDate);
      sinon.assert.notCalled(isUserContractValidOnEventDates);
      sinon.assert.notCalled(isCustomerSubscriptionValid);
    }
  });

  it('should return false if event is intervention and customer subscription is not valid', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    isUserContractValidOnEventDates.returns(true);
    isCustomerSubscriptionValid.returns(false);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.calledWithExactly(isCustomerSubscriptionValid, event);
  });

  it('should return true if event is intervention and customer subscription is valid', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    isUserContractValidOnEventDates.returns(true);
    isCustomerSubscriptionValid.returns(true);

    const result = await EventsValidationHelper.isEditionAllowed(event, credentials);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(isUserContractValidOnEventDates, event);
    sinon.assert.calledWithExactly(isCustomerSubscriptionValid, event);
  });

  it('should return true', async () => {
    const credentials = { company: { _id: new ObjectId() } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERNAL_HOUR,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
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
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    hasConflicts.returns(true);
    try {
      await EventsValidationHelper.isCreationAllowed(event, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('L\'évènement est en conflit avec les évènements de l\'auxiliaire.');
    } finally {
      sinon.assert.notCalled(isEditionAllowed);
      sinon.assert.calledWithExactly(hasConflicts, event);
    }
  });

  it('should return true', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };

    hasConflicts.returns(false);
    isEditionAllowed.returns(true);

    const isValid = await EventsValidationHelper.isCreationAllowed(event, credentials);

    expect(isValid).toBeTruthy();
    sinon.assert.calledWithExactly(isEditionAllowed, event, credentials);
    sinon.assert.calledWithExactly(hasConflicts, event);
  });

  it('should return true as there is no conflict when no auxiliary assigned', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const event = {
      sector: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
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
  let countDocuments;
  beforeEach(() => {
    isEditionAllowed = sinon.stub(EventsValidationHelper, 'isEditionAllowed');
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    countDocuments = sinon.stub(Contract, 'countDocuments');
  });
  afterEach(() => {
    isEditionAllowed.restore();
    hasConflicts.restore();
    countDocuments.restore();
  });

  it('should return true if everything is ok', async () => {
    const auxiliaryId = new ObjectId();
    const payload = { startDate: '2019-04-13T09:00:00.000Z', endDate: '2019-04-13T11:00:00.000Z' };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      repetition: { frequency: 'every_week' },
      startDate: '2019-01-01T09:00:00.000Z',
      endDate: '2019-01-01T11:00:00.000Z',
    };
    hasConflicts.returns(false);
    isEditionAllowed.returns(true);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeTruthy();
    sinon.assert.calledOnceWithExactly(
      hasConflicts,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00.000Z',
        endDate: '2019-04-13T11:00:00.000Z',
        repetition: { frequency: 'every_week' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      isEditionAllowed,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00.000Z',
        endDate: '2019-04-13T11:00:00.000Z',
        repetition: { frequency: 'every_week' },
      }
    );
  });

  it('should return false if event is startDate timeStamped and start date updated', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:05:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      startDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is startDate timeStamped and auxiliary updated', async () => {
    const payload = {
      auxiliary: new ObjectId(),
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };
    const eventFromDB = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      startDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is startDate timeStamped and user cancels event', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      isCancelled: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      startDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is endDate timeStamped and end date updated', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:05:00.000Z',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      endDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is endDate timeStamped and auxiliary updated', async () => {
    const payload = {
      auxiliary: new ObjectId(),
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };
    const eventFromDB = {
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      endDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is endDate timeStamped and user cancels event', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      isCancelled: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      endDateTimeStamp: 1,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBe(false);
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false if event is billed', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      endDateTimeStamp: 1,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isBilled: true,
      startDate: '2019-01-01T09:00:00.000Z',
      endDate: '2019-01-01T11:00:00.000Z',
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false as event is absence and auxiliary is updated', async () => {
    const payload = {
      auxiliary: new ObjectId(),
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };
    const eventFromDB = {
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      endDateTimeStamp: 1,
      auxiliary: new ObjectId(),
      type: ABSENCE,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false as repetition and auxiliary are updated and auxiliary\'s contract is ended', async () => {
    const payload = {
      auxiliary: new ObjectId(),
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      shouldUpdateRepetition: true,
    };
    const eventFromDB = {
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      auxiliary: new ObjectId(),
      type: INTERVENTION,
      repetition: { frequency: 'every_week' },
    };

    countDocuments.returns(0);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      { user: payload.auxiliary, endDate: { $exists: false }, startDate: { $lte: CompaniDate().endOf('day').toDate() } }
    );
  });

  it('should return true as repetition and auxiliary are updated and auxiliary\'s contract is not ended', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: new ObjectId(),
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      shouldUpdateRepetition: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      repetition: { frequency: 'every_week' },
      startDate: '2019-01-01T09:00:00.000Z',
      endDate: '2019-01-01T11:00:00.000Z',
    };
    hasConflicts.returns(false);
    isEditionAllowed.returns(true);
    countDocuments.returns(1);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeTruthy();
    sinon.assert.calledOnceWithExactly(
      countDocuments,
      { user: payload.auxiliary, endDate: { $exists: false }, startDate: { $lte: CompaniDate().endOf('day').toDate() } }
    );
    sinon.assert.calledOnceWithExactly(
      hasConflicts,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00.000Z',
        endDate: '2019-04-13T11:00:00.000Z',
        repetition: { frequency: 'every_week' },
        shouldUpdateRepetition: true,
        auxiliary: payload.auxiliary,
      }
    );
    sinon.assert.calledOnceWithExactly(
      isEditionAllowed,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00.000Z',
        endDate: '2019-04-13T11:00:00.000Z',
        repetition: { frequency: 'every_week' },
        shouldUpdateRepetition: true,
        auxiliary: payload.auxiliary,
      }
    );
  });

  it('should return false as event is unavailability and auxiliary is updated', async () => {
    const payload = {
      auxiliary: new ObjectId(),
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };
    const eventFromDB = {
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      endDateTimeStamp: 1,
      auxiliary: new ObjectId(),
      type: UNAVAILABILITY,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should throw 409 if event has auxiliairy, is single intervention not cancelled and has conflicts', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      startDate: '2019-01-01T09:00:00.000Z',
      endDate: '2019-01-01T11:00:00.000Z',
    };
    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(
        hasConflicts,
        {
          auxiliary: auxiliaryId,
          startDate: '2019-04-13T09:00:00.000Z',
          endDate: '2019-04-13T11:00:00.000Z',
          type: INTERVENTION,
        }
      );
      sinon.assert.notCalled(isEditionAllowed);
    }
  });

  it('should throw 409 if event has auxiliairy, has conflicts and cancellation is undone', async () => {
    const auxiliaryId = new ObjectId();
    const payload = {
      auxiliary: auxiliaryId,
      startDate: '2019-04-13T09:00:00.000Z',
      endDate: '2019-04-13T11:00:00.000Z',
      isCancelled: false,
      'repetition.frequency': 'never',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isCancelled: true,
      repetition: { frequency: 'every_week' },
      startDate: '2019-01-01T09:00:00.000Z',
      endDate: '2019-01-01T11:00:00.000Z',
    };
    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
    } finally {
      sinon.assert.calledOnceWithExactly(
        hasConflicts,
        {
          auxiliary: auxiliaryId,
          startDate: '2019-04-13T09:00:00.000Z',
          endDate: '2019-04-13T11:00:00.000Z',
          type: INTERVENTION,
          isCancelled: false,
          repetition: { frequency: 'never' },
        }
      );
      sinon.assert.notCalled(isEditionAllowed);
    }
  });

  it('should return false if edition is not allowed', async () => {
    const auxiliaryId = new ObjectId();
    const payload = { startDate: '2019-04-13T09:00:00.000Z', endDate: '2019-04-13T11:00:00.000Z' };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      repetition: { frequency: 'every_week' },
      startDate: '2019-01-01T09:00:00.000Z',
      endDate: '2019-01-01T11:00:00.000Z',
    };
    hasConflicts.returns(false);
    isEditionAllowed.returns(false);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload);

    expect(result).toBeFalsy();
    sinon.assert.calledOnceWithExactly(
      hasConflicts,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00.000Z',
        endDate: '2019-04-13T11:00:00.000Z',
        repetition: { frequency: 'every_week' },
      }
    );
    sinon.assert.calledOnceWithExactly(
      isEditionAllowed,
      {
        type: INTERVENTION,
        startDate: '2019-04-13T09:00:00.000Z',
        endDate: '2019-04-13T11:00:00.000Z',
        repetition: { frequency: 'every_week' },
      }
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
    const events = [{ _id: new ObjectId(), type: INTERNAL_HOUR, isBilled: true }];

    eventHistoryCountDocuments.returns(0);

    await EventsValidationHelper.checkDeletionIsAllowed(events);

    sinon.assert.calledOnceWithExactly(
      eventHistoryCountDocuments, {
        'event.eventId': { $in: events.map(event => event._id) },
        'event.type': INTERVENTION,
        action: { $in: TIME_STAMPING_ACTIONS },
        isCancelled: false,
      }
    );
  });

  it('should return nothing if events are not billed and not timestamped', async () => {
    const events = [{ _id: new ObjectId(), type: INTERVENTION, isBilled: false }];

    eventHistoryCountDocuments.returns(0);

    await EventsValidationHelper.checkDeletionIsAllowed(events);

    sinon.assert.calledOnceWithExactly(
      eventHistoryCountDocuments, {
        'event.eventId': { $in: events.map(event => event._id) },
        'event.type': INTERVENTION,
        action: { $in: TIME_STAMPING_ACTIONS },
        isCancelled: false,
      }
    );
  });

  it('should return conflict if at least one event is a billed intervention', async () => {
    const events = [
      { _id: new ObjectId(), type: INTERVENTION, isBilled: true },
      { _id: new ObjectId(), type: INTERVENTION, isBilled: false },
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
      { _id: new ObjectId(), type: INTERVENTION, isBilled: false },
      { _id: new ObjectId(), type: INTERVENTION, isBilled: false },
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
          action: { $in: TIME_STAMPING_ACTIONS },
          isCancelled: false,
        }
      );
    }
  });
});
