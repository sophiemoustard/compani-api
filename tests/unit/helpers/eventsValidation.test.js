const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const User = require('../../../src/models/User');
const Customer = require('../../../src/models/Customer');
const Contract = require('../../../src/models/Contract');
const Surcharge = require('../../../src/models/Surcharge');
const EventsValidationHelper = require('../../../src/helpers/eventsValidation');
const EventRepository = require('../../../src/repositories/EventRepository');
const {
  INTERVENTION,
  ABSENCE,
  UNAVAILABILITY,
  INTERNAL_HOUR,
  CUSTOMER_CONTRACT,
  COMPANY_CONTRACT,
} = require('../../../src/helpers/constants');

require('sinon-mongoose');

describe('auxiliaryHasActiveCompanyContractOnDay', () => {
  it('should return false as no company contract', () => {
    const contracts = [{ status: CUSTOMER_CONTRACT }];
    const date = '2019-01-11T08:38:18';
    const result = EventsValidationHelper.auxiliaryHasActiveCompanyContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return false as no company contract on day (startDate after day)', () => {
    const contracts = [
      { status: CUSTOMER_CONTRACT },
      { status: COMPANY_CONTRACT, startDate: '2019-03-11T08:38:18' },
    ];
    const date = '2019-01-11T08:38:18';
    const result = EventsValidationHelper.auxiliaryHasActiveCompanyContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return false as no company contract on day (end date before day)', () => {
    const contracts = [
      { status: CUSTOMER_CONTRACT },
      { status: COMPANY_CONTRACT, startDate: '2019-01-01T08:38:18', endDate: '2019-01-10T08:38:18' },
    ];
    const date = '2019-01-11T08:38:18';
    const result = EventsValidationHelper.auxiliaryHasActiveCompanyContractOnDay(contracts, date);

    expect(result).toBeFalsy();
  });

  it('should return true as company contract on day (end date after day)', () => {
    const contracts = [
      { status: CUSTOMER_CONTRACT },
      { status: COMPANY_CONTRACT, startDate: '2019-01-01T08:38:18', endDate: '2019-01-31T08:38:18' },
    ];
    const date = '2019-01-11T08:38:18';
    const result = EventsValidationHelper.auxiliaryHasActiveCompanyContractOnDay(contracts, date);

    expect(result).toBeTruthy();
  });

  it('should return true as company contract on day (no endDate)', () => {
    const contracts = [
      { status: CUSTOMER_CONTRACT },
      { status: COMPANY_CONTRACT, startDate: '2019-01-01T08:38:18' },
    ];
    const date = '2019-01-11T08:38:18';
    const result = EventsValidationHelper.auxiliaryHasActiveCompanyContractOnDay(contracts, date);

    expect(result).toBeTruthy();
  });
});

describe('checkContracts', () => {
  let hasConflicts;
  let UserModel;
  let CustomerModel;
  let findOneContract;
  let findOneSurcharge;
  beforeEach(() => {
    hasConflicts = sinon.stub(EventsValidationHelper, 'hasConflicts');
    UserModel = sinon.mock(User);
    CustomerModel = sinon.mock(Customer);
    findOneContract = sinon.stub(Contract, 'findOne');
    findOneSurcharge = sinon.stub(Surcharge, 'findOne');
  });
  afterEach(() => {
    hasConflicts.restore();
    UserModel.restore();
    CustomerModel.restore();
    findOneContract.restore();
    findOneSurcharge.restore();
  });

  it('should return false as user has no contract', async () => {
    const event = { auxiliary: (new ObjectID()).toHexString() };
    const user = { _id: event.auxiliary };

    hasConflicts.returns(false);
    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);

    expect(result).toBeFalsy();
  });

  it('should return false if service event is customer contract and auxiliary does not have contract with customer', async () => {
    const subscriptionId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-02T08:00:00.000Z',
      endDate: '2019-10-02T10:00:00.000Z',
      sector: sectorId.toHexString(),
    };
    const customer = {
      _id: event.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: CUSTOMER_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(event.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = new Contract({
      user: event.auxiliary,
      customer: event.customer,
      versions: [{}],
      startDate: moment(event.startDate).add(1, 'd'),
    });
    findOneContract.returns(contract);

    const user = { _id: event.auxiliary, contracts: [contract], sector: sectorId };

    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);
    expect(result).toBeFalsy();
  });

  it('should return true if service event is customer contract and auxiliary has contract with customer', async () => {
    const subscriptionId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
      sector: sectorId.toHexString(),
    };

    const customer = {
      _id: event.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: CUSTOMER_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(event.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: event.auxiliary,
      customer: event.customer,
      versions: [{ weeklyHours: 12 }],
      startDate: moment(event.startDate).subtract(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: event.auxiliary, contracts: [contract], sector: sectorId };

    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);

    expect(result).toBeTruthy();
  });

  it('should return false if company contract and no active contract on day', async () => {
    const subscriptionId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
      sector: sectorId.toHexString(),
    };

    const customer = {
      _id: event.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(event.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: event.auxiliary,
      customer: event.customer,
      versions: [{}],
      status: COMPANY_CONTRACT,
      startDate: moment(event.startDate).add(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: event.auxiliary, contracts: [contract], sector: sectorId };

    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);

    expect(result).toBeFalsy();
  });

  it('should return true if company contract and active contract on day', async () => {
    const subscriptionId = new ObjectID();
    const sectorId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: subscriptionId.toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
      sector: sectorId.toHexString(),
    };

    const customer = {
      _id: event.customer,
      subscriptions: [{
        _id: subscriptionId,
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(event.startDate).subtract(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: event.auxiliary,
      customer: event.customer,
      versions: [{ weeklyHours: 12 }],
      status: COMPANY_CONTRACT,
      startDate: moment(event.startDate).subtract(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: event.auxiliary, contracts: [contract], sector: sectorId };

    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);

    expect(result).toBeTruthy();
  });

  it('should return false if company contract and customer has no subscription', async () => {
    const sectorId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      customer: (new ObjectID()).toHexString(),
      type: INTERVENTION,
      subscription: (new ObjectID()).toHexString(),
      startDate: '2019-10-03T08:00:00.000Z',
      endDate: '2019-10-03T10:00:00.000Z',
      sector: sectorId.toHexString(),
    };

    const customer = {
      _id: event.customer,
      subscriptions: [{
        _id: new ObjectID(),
        service: { type: COMPANY_CONTRACT, versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
        versions: [{ startDate: moment(event.startDate).add(1, 'd') }],
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: event.auxiliary,
      customer: event.customer,
      versions: [{ weeklyHours: 12 }],
      status: COMPANY_CONTRACT,
      startDate: moment(event.startDate).subtract(1, 'd'),
    };
    findOneContract.returns(contract);

    const user = { _id: event.auxiliary, contracts: [contract], sector: sectorId };

    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);

    expect(result).toBeFalsy();
  });

  it('should return false if event is internal hour and auxiliary does not have contract with company', async () => {
    const sectorId = new ObjectID();
    const event = {
      auxiliary: (new ObjectID()).toHexString(),
      type: INTERNAL_HOUR,
      startDate: '2019-10-03T00:00:00.000Z',
      sector: sectorId.toHexString(),
    };

    const customer = {
      _id: event.customer,
      subscriptions: [{
        _id: event.subscription,
        service: { type: '', versions: [{ startDate: '2019-10-02T00:00:00.000Z' }, { startDate: '2018-10-02T00:00:00.000Z' }] },
      }],
    };
    CustomerModel.expects('findOne')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customer);

    const contract = {
      user: event.auxiliary,
      customer: event.customer,
      versions: [{}],
      status: CUSTOMER_CONTRACT,
    };
    findOneContract.returns(contract);

    const user = { _id: event.auxiliary, contracts: [contract], sector: sectorId };

    const credentials = {};
    const result = await EventsValidationHelper.checkContracts(event, user, credentials);

    expect(result).toBeFalsy();
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
      company: new ObjectID(),
    };

    getAuxiliaryEventsBetweenDates.returns([
      { _id: new ObjectID(), startDate: '2019-10-02T08:00:00.000Z', endDate: '2019-10-02T12:00:00.000Z', type: ABSENCE },
    ]);

    await EventsValidationHelper.hasConflicts(event);

    sinon.assert.calledWith(getAuxiliaryEventsBetweenDates, auxiliaryId, '2019-10-02T09:00:00.000Z', '2019-10-02T11:00:00.000Z', event.company, ABSENCE);
  });
});

describe('isCreationAllowed', () => {
  let UserModel;
  let checkContracts;
  let hasConflicts;
  beforeEach(() => {
    UserModel = sinon.mock(User);
    checkContracts = sinon.stub(EventsValidationHelper, 'checkContracts');
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
    const credentials = {};
    const result = await EventsValidationHelper.isCreationAllowed(event, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isCreationAllowed(event, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isCreationAllowed(event, credentials);

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
    checkContracts = sinon.stub(EventsValidationHelper, 'checkContracts');
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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

    UserModel.verify();
    expect(result).toBeFalsy();
    sinon.assert.calledWith(hasConflicts, { ...eventFromDB, ...payload });
    sinon.assert.calledWith(checkContracts, { ...eventFromDB, ...payload }, user);
  });

  it('should return true as intervention is repeated and repetition should be updated', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      shouldUpdateRepetition: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERVENTION,
      repetition: { frequency: 'every_week' },
    };
    const user = { _id: auxiliaryId, sector: sectorId };

    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    checkContracts.returns(true);
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

    UserModel.verify();
    expect(result).toBeTruthy();
    sinon.assert.called(checkContracts);
    sinon.assert.notCalled(hasConflicts);
  });

  it('should return false as internal hour is repeated, repetition should be updated but has conflict', async () => {
    const sectorId = new ObjectID();
    const auxiliaryId = new ObjectID();
    const payload = {
      auxiliary: auxiliaryId.toHexString(),
      sector: sectorId.toHexString(),
      startDate: '2019-04-13T09:00:00',
      endDate: '2019-04-13T11:00:00',
      shouldUpdateRepetition: true,
    };
    const eventFromDB = {
      auxiliary: auxiliaryId,
      type: INTERNAL_HOUR,
      repetition: { frequency: 'every_week' },
    };
    const user = { _id: auxiliaryId, sector: sectorId };

    UserModel.expects('findOne')
      .withExactArgs({ _id: auxiliaryId.toHexString() })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(user);
    hasConflicts.returns(true);
    checkContracts.returns(true);
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

    UserModel.verify();
    expect(result).toBeFalsy();
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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

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
    const credentials = {};
    const result = await EventsValidationHelper.isEditionAllowed(eventFromDB, payload, credentials);

    UserModel.verify();
    expect(result).toBeTruthy();
    sinon.assert.calledWith(hasConflicts, { ...eventFromDB, ...payload });
    sinon.assert.calledWith(checkContracts, { ...eventFromDB, ...payload }, user);
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
