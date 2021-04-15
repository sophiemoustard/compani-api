const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const EventRepository = require('../../../src/repositories/EventRepository');
const { INTERVENTION, ABSENCE, INTERNAL_HOUR } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('isCustomerSubscriptionValid #tag', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Customer, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
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
    const customer = { _id: event.customer, subscriptions: [{ _id: subscriptionId }] };

    findOne.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));

    const result = await EventsValidationHelper.isCustomerSubscriptionValid(event);

    expect(result).toBe(true);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.customer }, { subscriptions: 1 }] },
        { query: 'lean' },
      ]
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
    const customer = { _id: event.customer, subscriptions: [{ _id: new ObjectID() }] };

    findOne.returns(SinonMongoose.stubChainedQueries([customer], ['lean']));

    const result = await EventsValidationHelper.isCustomerSubscriptionValid(event);

    expect(result).toBe(false);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: event.customer }, { subscriptions: 1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('isUserContractValidOnEventDates #tag', () => {
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

describe('isEditionAllowed #tag', () => {
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

  it('should return false as event is billed', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isBilled: true,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false as event is absence or availability and auxiliary is updated', async () => {
    const payload = {
      auxiliary: (new ObjectID()).toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: new ObjectID(),
      type: ABSENCE,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
  });

  it('should return false as event is not absence and no on one day', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-14T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      isBilled: true,
    };

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.notCalled(isEditionAllowed);
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

    isEditionAllowed.returns(false);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.calledWithExactly(isEditionAllowed, { type: ABSENCE, ...payload }, credentials);
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

    isEditionAllowed.returns(true);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeTruthy();
    sinon.assert.notCalled(hasConflicts);
    sinon.assert.calledWithExactly(isEditionAllowed, { type: INTERVENTION, ...payload }, credentials);
  });

  it('should return false as auxiliary does not have contracts', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };

    hasConflicts.returns(false);
    isEditionAllowed.returns(false);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeFalsy();
    sinon.assert.calledWithExactly(hasConflicts, { type: INTERVENTION, ...payload });
    sinon.assert.calledWithExactly(isEditionAllowed, { type: INTERVENTION, ...payload }, credentials);
  });

  it('should return false as event is not absence and has conflicts', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };

    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('Evènement en conflit avec les évènements de l\'auxiliaire.');
    } finally {
      sinon.assert.calledWithExactly(hasConflicts, { ...eventFromDB, ...payload });
      sinon.assert.notCalled(isEditionAllowed);
    }
  });

  it('should return false as event cancellation is undone, but there is conflict', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      isCancelled: true,
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };

    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('Evènement en conflit avec les évènements de l\'auxiliaire.');
    } finally {
      sinon.assert.calledWithExactly(hasConflicts, { ...eventFromDB, ...payload });
      sinon.assert.notCalled(isEditionAllowed);
    }
  });

  it('should return true as intervention is repeated and repetition should be updated', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      shouldUpdateRepetition: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      repetition: { frequency: 'every_week' },
    };

    isEditionAllowed.returns(true);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeTruthy();

    sinon.assert.notCalled(hasConflicts);
    sinon.assert.calledWithExactly(isEditionAllowed, { ...eventFromDB, ...payload }, credentials);
  });

  it('should return false as internal hour is repeated, repetition should be updated but has conflict', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      shouldUpdateRepetition: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERNAL_HOUR,
      repetition: { frequency: 'every_week' },
    };

    hasConflicts.returns(true);

    try {
      await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);
    } catch (e) {
      expect(e.output.statusCode).toEqual(409);
      expect(e.output.payload.message).toEqual('Evènement en conflit avec les évènements de l\'auxiliaire.');
    } finally {
      sinon.assert.notCalled(isEditionAllowed);
      sinon.assert.calledWithExactly(hasConflicts, { ...eventFromDB, ...payload });
    }
  });

  it('should return true', async () => {
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
    };

    hasConflicts.returns(false);
    isEditionAllowed.returns(true);

    const result = await EventsValidationHelper.isUpdateAllowed(eventFromDB, payload, credentials);

    expect(result).toBeTruthy();
    sinon.assert.calledWithExactly(hasConflicts, { ...eventFromDB, ...payload });
    sinon.assert.calledWithExactly(isEditionAllowed, { ...eventFromDB, ...payload }, credentials);
  });
});

describe('isDeletionAllowed', () => {
  it('should return false', async () => {
    const event = { type: INTERVENTION, isBilled: true };
    const result = EventsValidationHelper.isDeletionAllowed(event);
    expect(result).toBe(false);
  });

  it('should return true', async () => {
    const event = { type: INTERVENTION, isBilled: false };
    const result = EventsValidationHelper.isDeletionAllowed(event);
    expect(result).toBe(true);
  });

  it('should return true', async () => {
    const event = { type: INTERVENTION };
    const result = EventsValidationHelper.isDeletionAllowed(event);
    expect(result).toBe(true);
  });

  it('should return true', async () => {
    const event = { type: INTERNAL_HOUR, isBilled: true };
    const result = EventsValidationHelper.isDeletionAllowed(event);
    expect(result).toBe(true);
  });
});
