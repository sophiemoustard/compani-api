const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const UtilsHelper = require('../../../src/helpers/utils');
const ContractHelper = require('../../../src/helpers/contracts');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const EventRepository = require('../../../src/repositories/EventRepository');
const { INTERNAL_HOUR } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('getContractMonthInfo', () => {
  let getDaysRatioBetweenTwoDates;
  let getContractInfo;
  let getMatchingVersionsList;
  beforeEach(() => {
    getDaysRatioBetweenTwoDates = sinon.stub(UtilsHelper, 'getDaysRatioBetweenTwoDates');
    getContractInfo = sinon.stub(ContractHelper, 'getContractInfo');
    getMatchingVersionsList = sinon.stub(ContractHelper, 'getMatchingVersionsList');
  });
  afterEach(() => {
    getDaysRatioBetweenTwoDates.restore();
    getContractInfo.restore();
    getMatchingVersionsList.restore();
  });

  it('should get contract month info', () => {
    const versions = [
      { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
      { endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
    ];
    const contract = { versions };
    const query = { startDate: '2019-05-06', endDate: '2019-05-10' };
    getDaysRatioBetweenTwoDates.returns(4);
    getContractInfo.returns({ contractHours: 24, workedDaysRatio: 1 / 4 });
    getMatchingVersionsList.returns(versions[1]);

    const result = DraftPayHelper.getContractMonthInfo(contract, query, false);

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(104);
    expect(result.workedDaysRatio).toBe(1 / 4);
    sinon.assert.calledOnceWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-05-06').startOf('M').toDate(),
      moment('2019-05-06').endOf('M').toDate(),
      false
    );
    sinon.assert.calledOnceWithExactly(getContractInfo, versions[1], query, 4, false);
  });
});

describe('applyCustomSurcharge', () => {
  const start = '09:00';
  const end = '12:00';
  const paidTransport = 30;
  it('case 1 : dates included between start and end', async () => {
    const event = {
      startDate: '2019-03-12T09:00:00',
      endDate: '2019-03-12T11:00:00',
    };

    const result = DraftPayHelper.applyCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(2.5);
  });

  it('case 2 : startDate included between start and end and endDate after end', async () => {
    const event = {
      startDate: '2019-03-12T10:00:00',
      endDate: '2019-03-12T13:00:00',
    };

    const result = DraftPayHelper.applyCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(2.5);
  });

  it('case 3 : startDate before start and endDate included between start and end', async () => {
    const event = {
      startDate: '2019-03-12T08:00:00',
      endDate: '2019-03-12T10:00:00',
    };

    const result = DraftPayHelper.applyCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(1);
  });

  it('case 4 : startDate before start and endDate after end', async () => {
    const event = {
      startDate: '2019-03-12T07:00:00',
      endDate: '2019-03-12T13:00:00',
    };

    const result = DraftPayHelper.applyCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('case 4 : startDate and endDate before start', async () => {
    const event = {
      startDate: '2019-03-12T05:00:00',
      endDate: '2019-03-12T07:00:00',
    };

    const result = DraftPayHelper.applyCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(0);
  });
});

describe('getSurchargeDetails', () => {
  const surchargeId = new ObjectId();
  it('Case 1. surcharge plan and type included in details', () => {
    const surcharge = { _id: surchargeId, name: 'Super Mario', Noel: 35 };
    const details = { [surchargeId]: { Noel: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({
      [surchargeId]: { planName: 'Super Mario', Noel: { hours: 5, percentage: 35 } },
    });
  });

  it('Case 2. surcharge plan included in details but not surcharge type', () => {
    const surcharge = { _id: surchargeId, name: 'Super Mario', Noel: 35 };
    const details = { [surchargeId]: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({
      [surchargeId]: { planName: 'Super Mario', 10: { hours: 3 }, Noel: { hours: 2, percentage: 35 } },
    });
  });

  it('Case 3. surcharge plan and type not included in details', () => {
    const detailsId = new ObjectId();
    const surcharge = { _id: surchargeId, name: 'Luigi', Noel: 35 };
    const details = { [detailsId]: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({
      [detailsId]: { 10: { hours: 3 } },
      [surchargeId]: { planName: 'Luigi', Noel: { hours: 2, percentage: 35 } },
    });
  });
});

describe('applySurcharge', () => {
  let getSurchargeDetails;
  beforeEach(() => {
    getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
  });
  afterEach(() => {
    getSurchargeDetails.restore();
  });

  it('should apply surcharge', () => {
    getSurchargeDetails.returns({});
    const surcharge = { _id: new ObjectId(), name: 'Luigi', Noel: 35 };
    const details = { planId: { 10: { hours: 3 } } };
    const result = DraftPayHelper.applySurcharge(2.8, surcharge, 'name', details);

    expect(result).toEqual({ surcharged: 2.8, details: {} });
    sinon.assert.calledOnceWithExactly(getSurchargeDetails, 2.8, surcharge, 'name', details);
  });
});

describe('getSurchargeSplit', () => {
  let applySurcharge;
  let applyCustomSurcharge;
  let getSurchargeDetails;
  beforeEach(() => {
    applySurcharge = sinon.stub(DraftPayHelper, 'applySurcharge');
    applyCustomSurcharge = sinon.stub(DraftPayHelper, 'applyCustomSurcharge');
    getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
  });
  afterEach(() => {
    applySurcharge.restore();
    applyCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should apply 25th of december surcharge', () => {
    const event = { startDate: '2019-12-25T09:00:00', endDate: '2019-12-25T11:00:00' };
    const surcharge = { twentyFifthOfDecember: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applySurcharge, 2.5, surcharge, 'twentyFifthOfDecember', details);
    expect(result).toEqual({ surcharged: 2.5 });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should not apply 25th of december surcharge', () => {
    const event = { startDate: '2019-12-25T09:00:00', endDate: '2019-12-25T11:00:00' };
    const surcharge = { saturday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: { planId: { 10: { hours: 3 } } } });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should apply 1st of May surcharge', () => {
    const event = { startDate: '2019-05-01T09:00:00', endDate: '2019-05-01T11:00:00' };
    const surcharge = { firstOfMay: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applySurcharge, 2.5, surcharge, 'firstOfMay', details);
    expect(result).toEqual({ surcharged: 2.5 });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should not apply 1st of May surcharge', () => {
    const event = { startDate: '2019-05-01T09:00:00', endDate: '2019-05-01T11:00:00' };
    const surcharge = { saturday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: { planId: { 10: { hours: 3 } } } });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should apply 1st of January surcharge', () => {
    const event = { startDate: '2019-01-01T09:00:00', endDate: '2019-01-01T11:00:00' };
    const surcharge = { firstOfJanuary: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };

    applySurcharge.returns({ surcharged: 2.5 });

    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    expect(result).toEqual({ surcharged: 2.5 });
    sinon.assert.calledOnceWithExactly(applySurcharge, 2.5, surcharge, 'firstOfJanuary', details);
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should not apply 1st of January surcharge', () => {
    const event = { startDate: '2019-01-01T09:00:00', endDate: '2019-01-01T11:00:00' };
    const surcharge = { saturday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };

    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: { planId: { 10: { hours: 3 } } } });
    sinon.assert.notCalled(applySurcharge);
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should apply holiday surcharge', () => {
    const event = { startDate: '2022-05-08T09:00:00', endDate: '2022-05-08T11:00:00' };
    const surcharge = { publicHoliday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applySurcharge, 2.5, surcharge, 'publicHoliday', details);
    expect(result).toEqual({ surcharged: 2.5 });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should not apply holiday surcharge', () => {
    const event = { startDate: '2019-05-08T09:00:00', endDate: '2019-05-08T11:00:00' };
    const surcharge = { saturday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: { planId: { 10: { hours: 3 } } } });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should apply saturday surcharge', () => {
    const event = { startDate: '2019-04-27T09:00:00', endDate: '2019-04-27T11:00:00' };
    const surcharge = { saturday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applySurcharge, 2.5, surcharge, 'saturday', details);
    expect(result).toEqual({ surcharged: 2.5 });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should not apply saturday surcharge', () => {
    const event = { startDate: '2019-04-27T09:00:00', endDate: '2019-04-27T11:00:00' };
    const surcharge = { sunday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: { planId: { 10: { hours: 3 } } } });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should apply sunday surcharge', () => {
    const event = { startDate: '2019-04-28T09:00:00', endDate: '2019-04-28T11:00:00' };
    const surcharge = { sunday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applySurcharge, 2.5, surcharge, 'sunday', details);
    expect(result).toEqual({ surcharged: 2.5 });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should not apply sunday surcharge', () => {
    const event = { startDate: '2019-04-28T09:00:00', endDate: '2019-04-28T11:00:00' };
    const surcharge = { saturday: 20 };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: { planId: { 10: { hours: 3 } } } });
    sinon.assert.notCalled(applyCustomSurcharge);
    sinon.assert.notCalled(getSurchargeDetails);
  });

  it('should apply evening surcharge', () => {
    const event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    const surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    applyCustomSurcharge.returns(2);
    getSurchargeDetails.returns({ key: 2 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applyCustomSurcharge, event, '18:00', '20:00', 30);
    sinon.assert.calledOnceWithExactly(getSurchargeDetails, 2, surcharge, 'evening', details);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0.5, details: { key: 2 } });
    sinon.assert.notCalled(applySurcharge);
  });

  it('should apply custom surcharge', () => {
    const event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    const surcharge = { custom: 10, customEndTime: '20:00', customStartTime: '18:00' };
    applyCustomSurcharge.returns(2);
    const paidTransport = { duration: 30, distance: 10 };
    const details = { planId: { 10: { hours: 3 } } };
    getSurchargeDetails.returns({ key: 2 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, details, paidTransport);

    sinon.assert.calledOnceWithExactly(applyCustomSurcharge, event, '18:00', '20:00', 30);
    sinon.assert.calledOnceWithExactly(getSurchargeDetails, 2, surcharge, 'custom', details);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0.5, details: { key: 2 } });
    sinon.assert.notCalled(applySurcharge);
  });
});

describe('getTransportInfo', () => {
  const companyId = new ObjectId();
  let createDistanceMatrix;
  beforeEach(() => {
    createDistanceMatrix = sinon.stub(DistanceMatrixHelper, 'createDistanceMatrix');
  });
  afterEach(() => {
    createDistanceMatrix.restore();
  });

  it('should return 0 if no origins', async () => {
    const distances = [];
    const result = await DraftPayHelper.getTransportInfo(distances, null, 'lalal', 'repos', companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if no destination', async () => {
    const distances = [];
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', null, 'repos', companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if no mode', async () => {
    const distances = [];
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'repos', null, companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return distance info found in db', async () => {
    const distances = [{
      origins: 'lalal',
      destinations: 'paradis',
      mode: 'repos',
      duration: 120,
      distance: 2000,
    }];
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'paradis', 'repos', companyId);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 2, duration: 2 });
  });

  it('should call google maps api as no data found in database', async () => {
    const distances = [{ origins: 'lilili', destinations: 'enfer', mode: 'boulot', duration: 120 }];
    createDistanceMatrix.resolves({ duration: 120, distance: 3000 });
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'paradis', 'repos', companyId);

    expect(result).toBeDefined();
    const query = {
      origins: 'lalal',
      destinations: 'paradis',
      mode: 'repos',
    };
    sinon.assert.calledOnceWithExactly(createDistanceMatrix, query, companyId);
    expect(result).toEqual({ duration: 2, distance: 3 });
  });
});

describe('getPaidTransportInfo', () => {
  let getTransportInfo;
  beforeEach(() => {
    getTransportInfo = sinon.stub(DraftPayHelper, 'getTransportInfo');
  });

  afterEach(() => {
    getTransportInfo.restore();
  });

  it('should return 0 if prevEvent is null', async () => {
    const event = {};
    const result = await DraftPayHelper.getPaidTransportInfo(event, null, []);

    expect(result).toEqual({
      duration: 0,
      destinations: null,
      breakDuration: 0,
      origins: null,
      paidKm: 0,
      travelledKm: 0,
      pickTransportDuration: false,
      transportDuration: 0,
    });
  });

  it('should return 0 if prevEvent has fixed service', async () => {
    const event = { hasFixedService: false };
    const prevEvent = { hasFixedService: true };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      duration: 0,
      paidKm: 0,
      travelledKm: 0,
      destinations: null,
      breakDuration: 0,
      origins: null,
      pickTransportDuration: false,
      transportDuration: 0,
    });
  });

  it('should return 0 if event has fixed service', async () => {
    const event = { hasFixedService: true };
    const prevEvent = { hasFixedService: false };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      duration: 0,
      paidKm: 0,
      travelledKm: 0,
      destinations: null,
      breakDuration: 0,
      origins: null,
      pickTransportDuration: false,
      transportDuration: 0,
    });
  });

  it('should return 0 if no address in event', async () => {
    const event = {
      type: 'intervention',
      hasFixedService: false,
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
    };
    const prevEvent = {
      type: 'intervention',
      hasFixedService: false,
      startDate: '2019-01-18T15:46:30.636Z',
      address: { fullAddress: 'tamalou' },
    };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({ duration: 0, paidKm: 0, travelledKm: 0 });
  });

  it('should return 0 if no address in prevEvent', async () => {
    const event = {
      type: 'intervention',
      hasFixedService: false,
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      startDate: '2019-01-18T15:46:30.636Z',
    };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ duration: 0, paidKm: 0, travelledKm: 0 });
  });

  it('should return 0 if no tranport mode', async () => {
    const event = {
      hasFixedService: false,
      type: 'intervention',
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      startDate: '2019-01-18T15:46:30.636Z',
      address: { fullAddress: 'tamalou' },
    };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ duration: 0, paidKm: 0, travelledKm: 0 });
  });

  it('should compute driving transport', async () => {
    const event = {
      hasFixedService: false,
      type: 'intervention',
      startDate: '2019-01-18T16:46:30',
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
      company: new ObjectId(),
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:46:30',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.returns({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      duration: 40,
      paidKm: 10,
      travelledKm: 10,
      origins: 'tamalou',
      destinations: 'jébobolà',
      transportDuration: 40,
      breakDuration: 60,
      pickTransportDuration: true,
    });
    sinon.assert.calledOnceWithExactly(getTransportInfo, [], 'tamalou', 'jébobolà', 'driving', event.company);
  });

  it('should not paid transport if specific transport is not personal car', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T18:00:00',
      type: 'intervention',
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
      transportMode: 'public',

    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.returns({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      duration: 40,
      paidKm: 0,
      travelledKm: 10,
      destinations: 'jébobolà',
      breakDuration: 180,
      origins: 'tamalou',
      pickTransportDuration: true,
      transportDuration: 40,
    });
    sinon.assert.calledOnceWithExactly(getTransportInfo, [], 'tamalou', 'jébobolà', 'transit', event.company);
  });

  it('should not paid transport if default transport is not personal car', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T18:00:00',
      type: 'intervention',
      auxiliary: { administrative: { transportInvoice: { transportType: 'public' } } },
      address: { fullAddress: 'jébobolà' },
      transportMode: 'private',
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.returns({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      duration: 40,
      paidKm: 0,
      travelledKm: 10,
      breakDuration: 180,
      destinations: 'jébobolà',
      origins: 'tamalou',
      pickTransportDuration: true,
      transportDuration: 40,
    });
    sinon.assert.calledOnceWithExactly(getTransportInfo, [], 'tamalou', 'jébobolà', 'driving', event.company);
  });

  it('should compute transit transport', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T18:00:00',
      type: 'intervention',
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      paidKm: 10,
      travelledKm: 10,
      duration: 40,
      breakDuration: 180,
      destinations: 'jébobolà',
      origins: 'tamalou',
      pickTransportDuration: true,
      transportDuration: 40,
    });
  });

  it('should return break duration', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T16:10:00',
      type: 'intervention',
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 10, duration: 60 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      paidKm: 10,
      travelledKm: 10,
      duration: 70,
      breakDuration: 70,
      destinations: 'jébobolà',
      origins: 'tamalou',
      pickTransportDuration: false,
      transportDuration: 60,
    });
  });

  it('should return 0 if break duration is selected but is negative', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T16:10:00',
      type: 'intervention',
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T17:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 10, duration: 60 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      paidKm: 10,
      travelledKm: 10,
      duration: 0,
      breakDuration: -50,
      destinations: 'jébobolà',
      origins: 'tamalou',
      pickTransportDuration: false,
      transportDuration: 60,
    });
  });

  it('should return transport duration if transport duration is shorter than break duration', async () => {
    const event = {
      startDate: '2019-01-18T18:00:00',
      type: 'intervention',
      hasFixedService: false,
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 10, duration: 60 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      paidKm: 10,
      travelledKm: 10,
      duration: 60,
      breakDuration: 180,
      destinations: 'jébobolà',
      origins: 'tamalou',
      pickTransportDuration: true,
      transportDuration: 60,
    });
  });

  it('should return break if break is shorter than transport duration', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T15:30:00',
      type: 'intervention',
      auxiliary: { administrative: { transportInvoice: { transportType: 'private' } } },
      address: { fullAddress: 'jébobolà' },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 8, duration: 60 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({
      paidKm: 8,
      travelledKm: 8,
      duration: 30,
      breakDuration: 30,
      destinations: 'jébobolà',
      origins: 'tamalou',
      pickTransportDuration: false,
      transportDuration: 60,
    });
  });
});

describe('getEventHours', () => {
  let getPaidTransportInfo;
  let getSurchargeSplit;
  beforeEach(() => {
    getPaidTransportInfo = sinon.stub(DraftPayHelper, 'getPaidTransportInfo');
    getSurchargeSplit = sinon.stub(DraftPayHelper, 'getSurchargeSplit');
  });

  afterEach(() => {
    getPaidTransportInfo.restore();
    getSurchargeSplit.restore();
  });

  const event = { startDate: '2019-03-12T09:00:00', endDate: '2019-03-12T11:00:00' };
  const prevEvent = {};
  const details = {};
  const distanceMatrix = [];

  it('should not call getSurchargeSplit if no service', async () => {
    const service = null;
    getPaidTransportInfo.returns({ paidKm: 12, travelledKm: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 12,
      travelledKm: 12,
      paidTransportHours: 0.5,
    });
    sinon.assert.notCalled(getSurchargeSplit);
  });

  it('should not call getSurchargeSplit if no surcharge', async () => {
    const service = { nature: 'hourly' };
    getPaidTransportInfo.returns({ paidKm: 12, travelledKm: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 12,
      travelledKm: 12,
      paidTransportHours: 0.5,
    });
    sinon.assert.notCalled(getSurchargeSplit);
  });

  it('should call getSurchargeSplit if hourly service with surcharge', async () => {
    const service = { surcharge: { sunday: 10 }, nature: 'hourly' };
    getPaidTransportInfo.returns({ paidKm: 0, travelledKm: 12, duration: 30 });
    getSurchargeSplit.returns({ surcharged: 10, notSurcharged: 2.5, paidTransportHours: 0.5 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({
      surcharged: 10,
      notSurcharged: 2.5,
      paidTransportHours: 0.5,
      paidKm: 0,
      travelledKm: 12,
      details: {},
    });
    sinon.assert.calledOnceWithExactly(
      getSurchargeSplit,
      event,
      { sunday: 10 },
      details,
      { paidKm: 0, travelledKm: 12, duration: 30 }
    );
  });
});

describe('getTransportRefund', () => {
  const workedDaysRatio = 0.8;

  it('should return 0 as no transport type', () => {
    const auxiliary = { administrative: { transportInvoice: { driveId: '1234567890' } } };
    const company = {};
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no doc', () => {
    const auxiliary = { administrative: { transportInvoice: { transportType: 'public', link: null } } };
    const company = {};
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no subvention', () => {
    const auxiliary = { administrative: { transportInvoice: { transportType: 'public', link: '1234567890' } } };
    const company = {};
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no zipcode', () => {
    const auxiliary = { administrative: { transportInvoice: { transportType: 'public', link: '1234567890' } } };
    const company = { rhConfig: { transportSubs: [] } };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no matching subvention', () => {
    const auxiliary = {
      administrative: { transportInvoice: { transportType: 'public', link: '1234567890' } },
      contact: { address: { zipCode: '75' } },
    };
    const company = {
      rhConfig: { transportSubs: [{ department: '92', price: 10 }] },
    };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return public transport refund', () => {
    const auxiliary = {
      administrative: { transportInvoice: { transportType: 'public', link: '1234567890' } },
      contact: { address: { zipCode: '75' } },
    };
    const company = {
      rhConfig: { transportSubs: [{ department: '75', price: 10 }] },
    };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(4);
  });

  it('should return private transport refund', () => {
    const auxiliary = {
      administrative: { transportInvoice: { transportType: 'private' } },
    };
    const company = {
      rhConfig: { amountPerKm: 0.35 },
    };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio, 15);

    expect(result).toBe(5.25);
  });
});

describe('getPayFromEvents', () => {
  let getMatchingVersion;
  let getEventHours;
  const auxiliary = { _id: '1234567890' };
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getEventHours = sinon.stub(DraftPayHelper, 'getEventHours');
  });
  afterEach(() => {
    getMatchingVersion.restore();
    getEventHours.restore();
  });

  it('should return 0 for all keys if no events', async () => {
    const result = await DraftPayHelper.getPayFromEvents([], {}, [], [], [], [], {});

    expect(result).toBeDefined();
    expect(result).toEqual({
      internalHours: 0,
      paidTransportHours: 0,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndNotExemptDetails: {},
      surchargedAndExemptDetails: {},
      paidKm: 0,
      travelledKm: 0,
    });
    sinon.assert.notCalled(getMatchingVersion);
    sinon.assert.notCalled(getEventHours);
  });

  it('should return 0 for all keys if one event linked to fixed service', async () => {
    const subId = new ObjectId();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: true,
        subscription: subId,
      }],
    ];
    const subscriptions = {
      [subId]: { _id: subId, service: { nature: 'fixed', versions: [{ startDate: '2019-02-22T00:00:00' }] } },
    };
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, subscriptions, [], [], [], query);

    expect(result).toBeDefined();
    expect(result).toEqual({
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndNotExemptDetails: {},
      surchargedAndExemptDetails: {},
      paidKm: 0,
      travelledKm: 0,
      internalHours: 0,
      paidTransportHours: 0,
    });
    sinon.assert.notCalled(getMatchingVersion);
    sinon.assert.notCalled(getEventHours);
  });

  it('should get matching service version for intervention', async () => {
    const surchargeId = new ObjectId();
    const subId = new ObjectId();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: subId,
      }],
    ];
    const subscriptions = {
      [subId]: { _id: subId, service: { versions: [{ startDate: '2019-02-22T00:00:00' }], surcharge: surchargeId } },
    };
    const surcharges = [
      { _id: surchargeId, sunday: 10 },
      { _id: new ObjectId(), sunday: 14 },
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.returns({ startDate: '2019-02-22T00:00:00', surcharge: surchargeId });
    getEventHours.returns({ surcharged: 2, notSurcharged: 5, details: {}, paidKm: 5.8, travelledKm: 5.8 });

    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, subscriptions, [], surcharges, query);

    expect(result).toBeDefined();
    sinon.assert.calledOnceWithExactly(
      getMatchingVersion,
      '2019-07-12T09:00:00',
      { versions: [{ startDate: '2019-02-22T00:00:00' }], surcharge: surchargeId },
      'startDate'
    );
  });

  it('should return pay for event exempted from charge service', async () => {
    const surchargeId = new ObjectId();
    const subId = new ObjectId();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: subId,
      }],
    ];
    const subscriptions = {
      [subId]: {
        _id: subId,
        service: { versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: true }], surcharge: surchargeId },
      },
    };
    const surcharges = [{ _id: surchargeId, sunday: 10 }, { _id: new ObjectId(), sunday: 14 }];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.returns({ startDate: '2019-02-22T00:00:00', surcharge: surchargeId, exemptFromCharges: true });
    getEventHours.returns({
      surcharged: 2,
      notSurcharged: 5,
      details: { sunday: 10 },
      paidKm: 5.8,
      travelledKm: 5.8,
      paidTransportHours: 2,
    });

    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, subscriptions, [], surcharges, query);

    expect(result).toBeDefined();
    expect(result).toEqual({
      workedHours: 7,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 5,
      surchargedAndExempt: 2,
      surchargedAndNotExemptDetails: {},
      surchargedAndExemptDetails: { sunday: 10 },
      paidKm: 5.8,
      travelledKm: 5.8,
      internalHours: 0,
      paidTransportHours: 2,
    });
    sinon.assert.calledOnceWithExactly(
      getEventHours,
      { ...events[0][0], auxiliary },
      false,
      { startDate: '2019-02-22T00:00:00', surcharge: { _id: surchargeId, sunday: 10 }, exemptFromCharges: true },
      {},
      []
    );
  });

  it('should return pay for not exempted from charge service', async () => {
    const surchargeId = new ObjectId();
    const subId = new ObjectId();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: subId,
      }],
    ];
    const subscriptions = {
      [subId]: {
        _id: subId,
        service: { versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }], surcharge: surchargeId },
      },
    };
    const surcharges = [{ _id: surchargeId, sunday: 10 }, { _id: new ObjectId(), sunday: 14 }];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.returns({ startDate: '2019-02-22T00:00:00', surcharge: surchargeId, exemptFromCharges: false });
    getEventHours.returns({
      surcharged: 2,
      notSurcharged: 5,
      details: { sunday: 10 },
      paidKm: 5.8,
      travelledKm: 5.8,
      paidTransportHours: 3,
    });
    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, subscriptions, [], surcharges, query);

    expect(result).toBeDefined();
    expect(result).toEqual({
      workedHours: 7,
      notSurchargedAndNotExempt: 5,
      surchargedAndNotExempt: 2,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndNotExemptDetails: { sunday: 10 },
      surchargedAndExemptDetails: {},
      paidKm: 5.8,
      travelledKm: 5.8,
      paidTransportHours: 3,
      internalHours: 0,
    });
    sinon.assert.calledOnceWithExactly(
      getEventHours,
      { ...events[0][0], auxiliary },
      false,
      { startDate: '2019-02-22T00:00:00', surcharge: { _id: surchargeId, sunday: 10 }, exemptFromCharges: false },
      {},
      []
    );
  });

  it('should return pay for internal hour', async () => {
    const surchargeId = new ObjectId();
    const subId = new ObjectId();
    const subscriptions = [{ _id: subId, service: { _id: new ObjectId() } }];
    const events = [[{ startDate: '2019-07-12T09:00:00', endDate: '2019-07-01T11:00:00', type: INTERNAL_HOUR }]];
    const surcharges = [{ _id: surchargeId, sunday: 10 }, { _id: new ObjectId(), sunday: 14 }];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getEventHours.returns({
      surcharged: 0,
      notSurcharged: 5,
      details: {},
      paidKm: 5.8,
      travelledKm: 5.8,
      paidTransportHours: 2,
    });

    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, subscriptions, [], surcharges, query);

    expect(result).toBeDefined();
    expect(result).toEqual({
      workedHours: 5,
      notSurchargedAndNotExempt: 5,
      surchargedAndNotExempt: 0,
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndNotExemptDetails: {},
      surchargedAndExemptDetails: {},
      paidKm: 5.8,
      travelledKm: 5.8,
      internalHours: 5,
      paidTransportHours: 2,
    });
    sinon.assert.calledOnceWithExactly(getEventHours, { ...events[0][0], auxiliary }, false, null, {}, []);
    sinon.assert.notCalled(getMatchingVersion);
  });

  it('should return pay from multiple events', async () => {
    const surchargeId = new ObjectId();
    const subId1 = new ObjectId();
    const subId2 = new ObjectId();
    const subId3 = new ObjectId();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-12T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: subId1,
      }],
      [{
        startDate: '2019-07-13T09:00:00',
        endDate: '2019-07-13T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: subId2,
      }],
      [{
        startDate: '2019-07-14T09:00:00',
        endDate: '2019-07-14T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: subId3,
      }],
    ];
    const subscriptions = {
      [subId1]: {
        _id: subId1,
        service: { versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }], surcharge: surchargeId },
      },
      [subId2]: {
        _id: subId2,
        service: { versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }], surcharge: surchargeId },
      },
      [subId3]: {
        _id: subId3,
        service: { versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }], surcharge: surchargeId },
      },
    };
    const surcharges = [{ _id: surchargeId, sunday: 10 }, { _id: new ObjectId(), sunday: 14 }];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.onCall(0).returns({ exemptFromCharges: false });
    getMatchingVersion.onCall(1).returns({ exemptFromCharges: true });
    getMatchingVersion.onCall(2).returns({ exemptFromCharges: true });
    getEventHours.onCall(0).returns({
      surcharged: 2,
      notSurcharged: 5,
      details: {},
      paidKm: 5.8,
      travelledKm: 5.8,
      paidTransportHours: 3,
    });
    getEventHours.onCall(1).returns({
      surcharged: 4,
      notSurcharged: 0,
      details: {},
      paidKm: 3.2,
      travelledKm: 3.2,
      paidTransportHours: 0,
    });
    getEventHours.onCall(2).returns({
      surcharged: 2,
      notSurcharged: 5,
      details: {},
      paidKm: 0,
      travelledKm: 2,
      paidTransportHours: 1,
    });

    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, subscriptions, [], surcharges, query);

    expect(result).toBeDefined();
    expect(result).toEqual({
      workedHours: 18,
      notSurchargedAndNotExempt: 5,
      surchargedAndNotExempt: 2,
      notSurchargedAndExempt: 5,
      surchargedAndExempt: 6,
      surchargedAndNotExemptDetails: {},
      surchargedAndExemptDetails: {},
      paidKm: 9,
      travelledKm: 11,
      internalHours: 0,
      paidTransportHours: 4,
    });
  });
});

describe('getHoursFromDailyAbsence', () => {
  let getMatchingVersion;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
  });
  afterEach(() => {
    getMatchingVersion.restore();
  });

  describe('no contract change on this month', () => {
    it('should return paid hours from daily absence with one version in contract', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absence = { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' };
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getHoursFromDailyAbsence(absence, contract, query);

      expect(result).toBe(2);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('should return paid hours from daily absence with two versions in contract', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absence = { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' };
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      };

      getMatchingVersion.returns({ weeklyHours: 12 });
      const result = DraftPayHelper.getHoursFromDailyAbsence(absence, contract, query);

      expect(result).toBe(2);
      sinon.assert.calledOnceWithExactly(
        getMatchingVersion,
        moment(absence.startDate).startOf('d'),
        contract,
        'startDate'
      );
    });

    it('should only consider in query range event days', () => {
      const query = { startDate: '2022-05-02T07:00:00', endDate: '2022-05-31T07:00:00' };
      const absence = { absenceNature: 'daily', startDate: '2022-04-18T10:00:00', endDate: '2022-05-18T12:00:00' };
      const contract = {
        startDate: '2022-02-18T07:00:00',
        endDate: '2022-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      };

      getMatchingVersion.returns({ weeklyHours: 12 });

      const result = DraftPayHelper.getHoursFromDailyAbsence(absence, contract, query);

      expect(result).toBe(30);
      sinon.assert.calledWithExactly(
        getMatchingVersion.getCall(0),
        moment(query.startDate).startOf('d'),
        contract,
        'startDate'
      );
      sinon.assert.callCount(getMatchingVersion, 15);
    });
  });

  describe('contract begins or ends during this month', () => {
    it('contract begins in middle of absence', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absence = { absenceNature: 'daily', startDate: '2019-05-02T07:00:00', endDate: '2019-05-06T22:00:00' };
      const contract = { startDate: '2019-05-03T07:00:00', versions: [{ weeklyHours: 12 }] };

      const result = DraftPayHelper.getHoursFromDailyAbsence(absence, contract, query);

      expect(result).toBe(6);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('contract ends in middle of absence', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absence = { absenceNature: 'daily', startDate: '2019-05-02T07:00:00', endDate: '2019-05-06T22:00:00' };
      const contract = {
        startDate: '2019-04-03T07:00:00',
        endDate: '2019-05-04T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getHoursFromDailyAbsence(absence, contract, query);

      expect(result).toBe(6);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('contract ends during an entire month of absence', () => {
      const query = { startDate: '2022-05-01T07:00:00', endDate: '2022-05-31T07:00:00' };
      const absence = { absenceNature: 'daily', startDate: '2022-03-02T10:00:00', endDate: '2022-06-18T12:00:00' };
      const contract = {
        startDate: '2022-04-18T07:00:00',
        endDate: '2022-05-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getHoursFromDailyAbsence(absence, contract, query);

      expect(result).toBe(30);
      sinon.assert.notCalled(getMatchingVersion);
    });
  });
});

describe('getAbsenceHours', () => {
  let getHoursFromDailyAbsence;
  beforeEach(() => {
    getHoursFromDailyAbsence = sinon.stub(DraftPayHelper, 'getHoursFromDailyAbsence');
  });
  afterEach(() => {
    getHoursFromDailyAbsence.restore();
  });

  it('should return daily absence hours', async () => {
    const absence = { absenceNature: 'daily', startDate: '2019-07-17T10:00:00', endDate: '2019-07-20T12:00:00' };
    const contracts = [
      {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      },
      {
        startDate: '2019-07-19T07:00:00',
        endDate: '2019-09-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      },
    ];

    getHoursFromDailyAbsence.onCall(0).returns(4);
    getHoursFromDailyAbsence.onCall(1).returns(4);
    const absenceHours = await DraftPayHelper.getAbsenceHours(absence, contracts);

    expect(absenceHours).toEqual(8);
    sinon.assert.calledTwice(getHoursFromDailyAbsence);
    sinon.assert.calledWithExactly(getHoursFromDailyAbsence, absence, contracts[0], absence);
    sinon.assert.calledWithExactly(getHoursFromDailyAbsence, absence, contracts[1], absence);
  });

  it('should return half-daily absence hours', async () => {
    const absence = { absenceNature: 'half-daily', startDate: '2019-05-18T10:00:00', endDate: '2019-05-18T12:00:00' };
    const contracts = [
      {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      },
      {
        startDate: '2019-07-19T07:00:00',
        endDate: '2019-09-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      },
    ];

    getHoursFromDailyAbsence.returns(1);
    const absenceHours = await DraftPayHelper.getAbsenceHours(absence, contracts, absence);

    expect(absenceHours).toEqual(1);
    sinon.assert.calledOnceWithExactly(getHoursFromDailyAbsence, absence, contracts[0], absence);
  });

  it('should return hourly absence hours', async () => {
    const absence = { absenceNature: 'hourly', startDate: '2019-05-18T10:00:00', endDate: '2019-05-18T12:00:00' };
    const contracts = [
      {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      },
      {
        startDate: '2019-07-19T07:00:00',
        endDate: '2019-09-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      },
    ];

    const absenceHours = await DraftPayHelper.getAbsenceHours(absence, contracts);

    expect(absenceHours).toEqual(2);
    sinon.assert.notCalled(getHoursFromDailyAbsence);
  });
});

describe('getPayFromAbsences', () => {
  let getHoursFromDailyAbsence;
  beforeEach(() => {
    getHoursFromDailyAbsence = sinon.stub(DraftPayHelper, 'getHoursFromDailyAbsence');
  });
  afterEach(() => {
    getHoursFromDailyAbsence.restore();
  });

  it('should return 0 if no absences', () => {
    const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
    const contract = {
      startDate: '2019-02-18T07:00:00',
      endDate: '2019-07-18T22:00:00',
      versions: [{ weeklyHours: 12 }],
    };
    const result = DraftPayHelper.getPayFromAbsences([], contract, query);

    expect(result).toBe(0);
  });

  it('should call getHoursFromDailyAbsence for every daily absence', () => {
    const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
    const absences = [
      { absenceNature: 'daily', startDate: '2019-05-01T07:00:00', endDate: '2019-05-01T22:00:00' },
      { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' },
    ];
    const contract = {
      startDate: '2019-02-18T07:00:00',
      endDate: '2019-07-18T22:00:00',
      versions: [{ weeklyHours: 12 }],
    };

    getHoursFromDailyAbsence.returns(2);

    const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

    expect(result).toBe(4);
    sinon.assert.calledWithExactly(getHoursFromDailyAbsence.getCall(0), absences[0], contract, query);
    sinon.assert.calledWithExactly(getHoursFromDailyAbsence.getCall(1), absences[1], contract, query);
  });

  it('should return paid hours from hourly absences', () => {
    const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
    const absences = [
      { absenceNature: 'hourly', startDate: '2019-05-18T10:00:00', endDate: '2019-05-18T12:00:00' },
      { absenceNature: 'hourly', startDate: '2019-06-18T10:00:00', endDate: '2019-06-18T12:00:00' },
    ];
    const contract = {
      startDate: '2019-02-18T07:00:00',
      endDate: '2019-07-18T22:00:00',
      versions: [{ weeklyHours: 12 }],
    };

    const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

    expect(result).toBe(4);
    sinon.assert.notCalled(getHoursFromDailyAbsence);
  });

  it('should return paid hours from daily and hourly absences', () => {
    const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
    const absences = [
      { absenceNature: 'daily', startDate: '2019-05-01T07:00:00', endDate: '2019-05-01T22:00:00' },
      { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' },
      { absenceNature: 'hourly', startDate: '2019-05-19T10:00:00', endDate: '2019-05-19T13:00:00' },
    ];
    const contract = {
      startDate: '2019-02-18T07:00:00',
      endDate: '2019-07-18T22:00:00',
      versions: [{ weeklyHours: 12 }],
    };

    getHoursFromDailyAbsence.returns(2);

    const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

    expect(result).toBe(7);
    sinon.assert.calledWithExactly(getHoursFromDailyAbsence.getCall(0), absences[0], contract, query);
    sinon.assert.calledWithExactly(getHoursFromDailyAbsence.getCall(1), absences[1], contract, query);
  });
});

describe('computeBalance', () => {
  let getPayFromEvents;
  let getPayFromAbsences;
  let getContractMonthInfo;
  let getTransportRefund;
  beforeEach(() => {
    getPayFromEvents = sinon.stub(DraftPayHelper, 'getPayFromEvents');
    getPayFromAbsences = sinon.stub(DraftPayHelper, 'getPayFromAbsences');
    getContractMonthInfo = sinon.stub(DraftPayHelper, 'getContractMonthInfo');
    getTransportRefund = sinon.stub(DraftPayHelper, 'getTransportRefund');
  });
  afterEach(() => {
    getPayFromEvents.restore();
    getPayFromAbsences.restore();
    getContractMonthInfo.restore();
    getTransportRefund.restore();
  });

  it('should return balance, contract begins during this month', async () => {
    const contract = { startDate: '2019-05-13T00:00:00' };
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [contract],
      administrative: {
        mutualFund: { has: true },
        phoneInvoice: { driveId: '123456', link: 'skusku' },
      },
    };
    const events = {
      events: [
        [{ startDate: '2019-05-08T10:00:00', endDate: '2019-05-08T12:00:00' }],
        [{ startDate: '2019-05-20T10:00:00', endDate: '2019-05-20T12:00:00' }],
      ],
      absences: [
        { startDate: '2019-05-10T10:00:00', endDate: '2019-05-15T12:00:00' },
        { startDate: '2019-05-28T10:00:00', endDate: '2019-06-05T12:00:00' },
        { startDate: '2019-04-03T10:00:00', endDate: '2019-05-05T12:00:00' },
      ],
    };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const company = { rhConfig: { phoneFeeAmount: 37, shouldPayHolidays: false } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };

    getPayFromEvents.returns({ workedHours: 138, notSurchargedAndNotExempt: 15, surchargedAndNotExempt: 9 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 150, workedDaysRatio: 0.8, holidaysHours: 3 });
    getTransportRefund.returns(26.54);

    const result =
      await DraftPayHelper.computeBalance(auxiliary, contract, events, subscriptions, company, query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual({
      contractHours: 150,
      absencesHours: 16,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 7,
      transport: 26.54,
      phoneFees: 29.6,
      hoursToWork: 131,
      holidaysHours: 3,
    });
    sinon.assert.calledOnceWithExactly(getPayFromEvents, [events.events[1]], auxiliary, subscriptions, [], [], query);
    sinon.assert.calledOnceWithExactly(getPayFromAbsences, [events.absences[0], events.absences[1]], contract, query);
  });

  it('should return balance without phoneFees', async () => {
    const contract = { startDate: '2019-05-13T00:00:00' };
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [contract],
      administrative: { mutualFund: { has: true }, phoneInvoice: { driveId: null, link: null } },
    };
    const events = {
      events: [
        [{ startDate: '2019-05-08T10:00:00', endDate: '2019-05-08T12:00:00' }],
        [{ startDate: '2019-05-20T10:00:00', endDate: '2019-05-20T12:00:00' }],
      ],
      absences: [
        { startDate: '2019-05-10T10:00:00', endDate: '2019-05-15T12:00:00' },
        { startDate: '2019-05-28T10:00:00', endDate: '2019-06-05T12:00:00' },
        { startDate: '2019-04-03T10:00:00', endDate: '2019-05-05T12:00:00' },
      ],
    };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const company = { rhConfig: { phoneFeeAmount: 37, shouldPayHolidays: false } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };

    getPayFromEvents.returns({ workedHours: 138, notSurchargedAndNotExempt: 15, surchargedAndNotExempt: 9 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 150, workedDaysRatio: 0.8, holidaysHours: 3 });
    getTransportRefund.returns(26.54);

    const result =
      await DraftPayHelper.computeBalance(auxiliary, contract, events, subscriptions, company, query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual({
      contractHours: 150,
      absencesHours: 16,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 7,
      transport: 26.54,
      phoneFees: 0,
      hoursToWork: 131,
      holidaysHours: 3,
    });
    sinon.assert.calledOnceWithExactly(getPayFromEvents, [events.events[1]], auxiliary, subscriptions, [], [], query);
    sinon.assert.calledOnceWithExactly(getPayFromAbsences, [events.absences[0], events.absences[1]], contract, query);
  });

  it('should return balance, contract ends during this month', async () => {
    const contract = { startDate: '2019-04-13T00:00:00', endDate: '2019-05-15T00:00:00' };
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [contract],
      administrative: { mutualFund: { has: true } },
    };
    const events = {
      events: [
        [{ startDate: '2019-05-08T10:00:00', endDate: '2019-05-08T12:00:00' }],
        [{ startDate: '2019-05-20T10:00:00', endDate: '2019-05-20T12:00:00' }],
      ],
      absences: [
        { startDate: '2019-05-10T10:00:00', endDate: '2019-05-13T12:00:00' },
        { startDate: '2019-05-28T10:00:00', endDate: '2019-06-05T12:00:00' },
        { startDate: '2019-04-03T10:00:00', endDate: '2019-05-05T12:00:00' },
        { startDate: '2019-05-14T10:00:00', endDate: '2019-05-28T12:00:00' },
      ],
    };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const company = { rhConfig: { phoneFeeAmount: 37, shouldPayHolidays: false } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };

    getPayFromEvents.returns({ workedHours: 0, notSurchargedAndNotExempt: 0, surchargedAndNotExempt: 0 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 0, workedDaysRatio: 8, holidaysHours: 0 });
    getTransportRefund.returns(26.54);

    await DraftPayHelper.computeBalance(auxiliary, contract, events, subscriptions, company, query, [], []);
    sinon.assert.calledOnceWithExactly(getPayFromEvents, [events.events[0]], auxiliary, subscriptions, [], [], query);
    sinon.assert.calledOnceWithExactly(
      getPayFromAbsences,
      [events.absences[0], events.absences[2], events.absences[3]],
      contract,
      query
    );
  });
});

describe('computeAuxiliaryDraftPay', () => {
  let computeBalance;
  beforeEach(() => {
    computeBalance = sinon.stub(DraftPayHelper, 'computeBalance');
  });
  afterEach(() => {
    computeBalance.restore();
  });

  it('should return draft pay for one auxiliary', async () => {
    const aux = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [{ startDate: '2019-05-13T00:00:00' }],
      administrative: { mutualFund: { has: true } },
    };
    const contract = { startDate: '2019-05-13T00:00:00' };
    const events = { events: [[{ auxiliary: '1234567890' }]], absences: [] };
    const company = { rhConfig: { phoneFeeAmount: 37, shouldPayHolidays: false } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = { hoursCounter: 10, diff: { hoursBalance: 2 } };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const computedPay = {
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 6,
      transport: 26.54,
      phoneFees: 29.6,
      bonus: 0,
    };
    computeBalance.returns(computedPay);

    const result = await DraftPayHelper.computeAuxiliaryDraftPay(
      aux,
      contract,
      events,
      subscriptions,
      prevPay,
      company,
      query,
      [],
      []
    );

    expect(result).toBeDefined();
    expect(result).toEqual({
      ...computedPay,
      diff: { hoursBalance: 2 },
      previousMonthHoursCounter: 10,
      auxiliaryId: '1234567890',
      auxiliary: {
        _id: '1234567890',
        identity: { firstname: 'Hugo', lastname: 'Lloris' },
        sector: { name: 'La ruche' },
      },
      startDate: '2019-05-13T00:00:00',
      endDate: '2019-05-31T23:59:59',
      month: '05-2019',
      mutual: false,
      hoursCounter: 18,
      overtimeHours: 0,
      additionalHours: 0,
    });
    sinon.assert.calledOnceWithExactly(
      computeBalance,
      aux,
      { startDate: '2019-05-13T00:00:00' },
      events,
      subscriptions,
      company,
      query,
      [],
      []
    );
  });

  it('should return draft pay with diff set to 0 if prev pay is null', async () => {
    const aux = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [{ startDate: '2019-05-13T00:00:00' }],
      administrative: { mutualFund: { has: true } },
    };
    const contract = { startDate: '2019-05-13T00:00:00' };
    const events = { events: [[{ auxiliary: '1234567890' }]], absences: [] };
    const company = { rhConfig: { phoneFeeAmount: 37, shouldPayHolidays: false } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = null;
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const computedPay = {
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 6,
      transport: 26.54,
      phoneFees: 29.6,
      bonus: 0,
    };
    computeBalance.returns(computedPay);
    const result = await DraftPayHelper
      .computeAuxiliaryDraftPay(aux, contract, events, subscriptions, prevPay, company, query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual({
      ...computedPay,
      diff: {
        absencesHours: 0,
        workedHours: 0,
        internalHours: 0,
        paidTransportHours: 0,
        notSurchargedAndNotExempt: 0,
        surchargedAndNotExempt: 0,
        surchargedAndNotExemptDetails: {},
        notSurchargedAndExempt: 0,
        surchargedAndExempt: 0,
        surchargedAndExemptDetails: {},
        hoursBalance: 0,
      },
      previousMonthHoursCounter: 0,
      auxiliaryId: '1234567890',
      auxiliary: {
        _id: '1234567890',
        identity: { firstname: 'Hugo', lastname: 'Lloris' },
        sector: { name: 'La ruche' },
      },
      startDate: '2019-05-13T00:00:00',
      endDate: '2019-05-31T23:59:59',
      month: '05-2019',
      mutual: false,
      hoursCounter: 6,
      overtimeHours: 0,
      additionalHours: 0,
    });
    sinon.assert.calledOnceWithExactly(
      computeBalance,
      aux,
      { startDate: '2019-05-13T00:00:00' },
      events,
      subscriptions,
      company,
      query,
      [],
      []
    );
  });
});

describe('computePrevPayDetailDiff', () => {
  it('should compute previous pay if hours and prevPay are defined', () => {
    const hours = {
      surchargedAndExemptDetails: {
        qwertyuiop: { evenings: { hours: 23 }, saturdays: { hours: 23 } },
        asdfghjkl: { christmas: { hours: 5 } },
      },
    };
    const prevPay = {
      surchargedAndExemptDetails: [
        { planId: 'qwertyuiop', evenings: { hours: 2 }, sundays: { hours: 3 } },
        { planId: 'zxcvbnm', evenings: { hours: 4 } },
      ],
    };
    const detailType = 'surchargedAndExemptDetails';

    const result = DraftPayHelper.computePrevPayDetailDiff(prevPay, hours, detailType);

    expect(result).toEqual({
      qwertyuiop: { evenings: { hours: 21 }, saturdays: { hours: 23 }, sundays: { hours: -3 } },
      asdfghjkl: { christmas: { hours: 5 } },
      zxcvbnm: { evenings: { hours: -4 } },
    });
  });

  it('should compute previous pay if hours is defined but not prevPay', () => {
    const hours = {
      surchargedAndExemptDetails: {
        qwertyuiop: { evenings: { hours: 23 }, saturdays: { hours: 23 } },
        asdfghjkl: { christmas: { hours: 5 } },
      },
    };
    const prevPay = { surchargedAndExemptDetails: [] };
    const detailType = 'surchargedAndExemptDetails';

    const result = DraftPayHelper.computePrevPayDetailDiff(prevPay, hours, detailType);

    expect(result).toEqual({
      qwertyuiop: { evenings: { hours: 23 }, saturdays: { hours: 23 } },
      asdfghjkl: { christmas: { hours: 5 } },
    });
  });

  it('should compute previous pay if prevPay is defined but not hours', () => {
    const hours = {};
    const prevPay = {
      surchargedAndExemptDetails: [
        { planId: 'qwertyuiop', evenings: { hours: 2 }, sundays: { hours: 3 } },
        { planId: 'zxcvbnm', evenings: { hours: 4 } },
      ],
    };
    const detailType = 'surchargedAndExemptDetails';

    const result = DraftPayHelper.computePrevPayDetailDiff(prevPay, hours, detailType);

    expect(result).toEqual({
      qwertyuiop: { evenings: { hours: -2 }, sundays: { hours: -3 } },
      zxcvbnm: { evenings: { hours: -4 } },
    });
  });
});

describe('computePrevPayDiff', () => {
  let getContractMonthInfo;
  let getPayFromEvents;
  let getPayFromAbsences;
  let computePrevPayDetailDiff;
  beforeEach(() => {
    getContractMonthInfo = sinon.stub(DraftPayHelper, 'getContractMonthInfo');
    getPayFromEvents = sinon.stub(DraftPayHelper, 'getPayFromEvents');
    getPayFromAbsences = sinon.stub(DraftPayHelper, 'getPayFromAbsences');
    computePrevPayDetailDiff = sinon.stub(DraftPayHelper, 'computePrevPayDetailDiff');
  });
  afterEach(() => {
    getContractMonthInfo.restore();
    getPayFromEvents.restore();
    getPayFromAbsences.restore();
    computePrevPayDetailDiff.restore();
  });

  it('should return diff without prevPay', async () => {
    const query = { startDate: '2019-09-01T00:00:00', endDate: '2019-09-30T23:59:59' };
    const auxiliary = { _id: '1234567890', contracts: [{ _id: 'poiuytre' }] };
    const events = [{ _id: new ObjectId() }];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const hours = {
      workedHours: 24,
      notSurchargedAndNotExempt: 12,
      surchargedAndNotExempt: 3,
      surchargedAndNotExemptDetails: {},
      notSurchargedAndExempt: 6,
      surchargedAndExempt: 3,
      surchargedAndExemptDetails: {},
      internalHours: 0,
      paidTransportHours: 0,
    };
    getContractMonthInfo.returns({ contractHours: 34 });
    getPayFromEvents.returns(hours);
    getPayFromAbsences.returns(5);
    computePrevPayDetailDiff.returnsArg(2);

    const result = await DraftPayHelper.computePrevPayDiff(auxiliary, events, subscriptions, null, query, [], []);

    expect(result).toEqual({
      auxiliary: '1234567890',
      diff: {
        absencesHours: 5,
        internalHours: 0,
        paidTransportHours: 0,
        workedHours: 24,
        notSurchargedAndNotExempt: 12,
        surchargedAndNotExempt: 3,
        surchargedAndNotExemptDetails: 'surchargedAndNotExemptDetails',
        notSurchargedAndExempt: 6,
        surchargedAndExempt: 3,
        surchargedAndExemptDetails: 'surchargedAndExemptDetails',
        hoursBalance: 29,
      },
      hoursCounter: 0,
    });
    sinon.assert.calledOnceWithExactly(getPayFromEvents, events.events, auxiliary, subscriptions, [], [], query);
    sinon.assert.calledOnceWithExactly(getPayFromAbsences, events.absences, { _id: 'poiuytre' }, query);
    sinon.assert.calledWithExactly(computePrevPayDetailDiff.getCall(0), null, hours, 'surchargedAndNotExemptDetails');
    sinon.assert.calledWithExactly(computePrevPayDetailDiff.getCall(1), null, hours, 'surchargedAndExemptDetails');
  });

  it('should return diff with prevPay', async () => {
    const query = { startDate: '2019-09-01T00:00:00', endDate: '2019-09-30T23:59:59' };
    const auxiliary = { _id: '1234567890', contracts: [{ _id: 'poiuytre' }] };
    const events = [{ _id: new ObjectId() }];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    const prevPay = {
      contractHours: 34,
      workedHours: 26,
      notSurchargedAndNotExempt: 12,
      surchargedAndNotExempt: 2,
      surchargedAndNotExemptDetails: {},
      notSurchargedAndExempt: 8,
      surchargedAndExempt: 4,
      surchargedAndExemptDetails: {},
      hoursBalance: -1,
      hoursCounter: 3,
      absencesHours: 0,
      internalHours: 1,
      paidTransportHours: 3,
    };
    const hours = {
      workedHours: 24,
      notSurchargedAndNotExempt: 12,
      surchargedAndNotExempt: 3,
      surchargedAndNotExemptDetails: {},
      notSurchargedAndExempt: 6,
      surchargedAndExempt: 0,
      surchargedAndExemptDetails: {},
      internalHours: 2,
      paidTransportHours: 4,
    };

    getPayFromEvents.returns(hours);
    getPayFromAbsences.returns(-2);
    computePrevPayDetailDiff.returnsArg(2);

    const result = await DraftPayHelper.computePrevPayDiff(auxiliary, events, subscriptions, prevPay, query, [], []);

    expect(result).toEqual({
      auxiliary: '1234567890',
      diff: {
        workedHours: -2,
        notSurchargedAndNotExempt: 0,
        surchargedAndNotExempt: 1,
        surchargedAndNotExemptDetails: 'surchargedAndNotExemptDetails',
        notSurchargedAndExempt: -2,
        surchargedAndExempt: -4,
        surchargedAndExemptDetails: 'surchargedAndExemptDetails',
        hoursBalance: -4,
        internalHours: 1,
        paidTransportHours: 1,
        absencesHours: -2,
      },
      hoursCounter: 3,
    });
    sinon.assert.calledOnceWithExactly(getPayFromEvents, events.events, auxiliary, subscriptions, [], [], query);
    sinon.assert.calledOnceWithExactly(getPayFromAbsences, events.absences, { _id: 'poiuytre' }, query);
    sinon.assert.calledWithExactly(
      computePrevPayDetailDiff.getCall(0),
      prevPay,
      hours,
      'surchargedAndNotExemptDetails'
    );
    sinon.assert.calledWithExactly(computePrevPayDetailDiff.getCall(1), prevPay, hours, 'surchargedAndExemptDetails');
  });
});

describe('getPreviousMonthPay', () => {
  const auxiliaryId = new ObjectId();
  let getEventsToPay;
  let computePrevPayDiff;
  beforeEach(() => {
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    computePrevPayDiff = sinon.stub(DraftPayHelper, 'computePrevPayDiff');
  });
  afterEach(() => {
    getEventsToPay.restore();
    computePrevPayDiff.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaries = [];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    getEventsToPay.returns([]);

    const result = await DraftPayHelper.getPreviousMonthPay(auxiliaries, subscriptions, query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should compute prev pay counter difference', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' }, prevPay: { _id: '1234567890' } }];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: subId, service: { _id: new ObjectId() } } };

    const payData = [
      {
        events: [{ startDate: '2019-05-03T10:00:00' }],
        absences: [{ startDate: '2019-05-06T10:00:00' }],
        auxiliary: auxiliaryId,
      }, {
        events: [{ startDate: '2019-05-04T10:00:00' }],
        absences: [{ startDate: '2019-05-07T10:00:00' }],
        auxiliary: new ObjectId(),
      },
    ];
    const dm = [{ _id: new ObjectId() }];
    const surcharges = [{ _id: new ObjectId() }];
    const companyId = new ObjectId();

    getEventsToPay.returns(payData);

    const result =
      await DraftPayHelper.getPreviousMonthPay(auxiliaries, subscriptions, query, surcharges, dm, companyId);

    expect(result).toBeDefined();
    sinon.assert.calledOnceWithExactly(
      getEventsToPay,
      moment(query.startDate).subtract(1, 'M').startOf('M').toDate(),
      moment(query.endDate).subtract(1, 'M').endOf('M').toDate(),
      [auxiliaryId],
      companyId
    );
    sinon.assert.calledOnceWithExactly(
      computePrevPayDiff,
      auxiliaries[0],
      payData[0],
      subscriptions,
      { _id: '1234567890' },
      {
        startDate: moment(query.startDate).subtract(1, 'M').startOf('M').toDate(),
        endDate: moment(query.endDate).subtract(1, 'M').endOf('M').toDate(),
      },
      dm,
      surcharges
    );
  });
});

describe('computeDraftPay', () => {
  let getEventsToPay;
  let getSubscriptionsForPay;
  let companyFindOne;
  let surchargeFind;
  let distanceMatrixFind;
  let getPreviousMonthPay;
  let computeAuxiliaryDraftPay;
  let getContract;
  beforeEach(() => {
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    getSubscriptionsForPay = sinon.stub(DraftPayHelper, 'getSubscriptionsForPay');
    companyFindOne = sinon.stub(Company, 'findOne');
    surchargeFind = sinon.stub(Surcharge, 'find');
    distanceMatrixFind = sinon.stub(DistanceMatrix, 'find');
    getPreviousMonthPay = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    computeAuxiliaryDraftPay = sinon.stub(DraftPayHelper, 'computeAuxiliaryDraftPay');
    getContract = sinon.stub(DraftPayHelper, 'getContract');
  });
  afterEach(() => {
    getEventsToPay.restore();
    getSubscriptionsForPay.restore();
    companyFindOne.restore();
    surchargeFind.restore();
    distanceMatrixFind.restore();
    getPreviousMonthPay.restore();
    computeAuxiliaryDraftPay.restore();
    getContract.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId, rhConfig: { shouldPayHolidays: false } } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };
    companyFindOne.returns(SinonMongoose.stubChainedQueries({ _id: companyId }, ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'sur' }], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'dm' }], ['lean']));
    getSubscriptionsForPay.returns(subscriptions);

    const result = await DraftPayHelper.computeDraftPay([], query, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledOnceWithExactly(
      getPreviousMonthPay,
      [],
      subscriptions,
      query,
      [{ _id: 'sur' }],
      [{ _id: 'dm' }],
      companyId
    );
    sinon.assert.notCalled(computeAuxiliaryDraftPay);
    SinonMongoose.calledOnceWithExactly(
      companyFindOne,
      [
        {
          query: 'findOne',
          args: [
            { _id: companyId },
            {
              'rhConfig.phoneFeeAmount': 1,
              'rhConfig.transportSubs': 1,
              'rhConfig.amountPerKm': 1,
              'rhConfig.shouldPayHolidays': 1,
            },
          ],
        },
        { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      surchargeFind,
      [
        { query: 'find', args: [{ company: companyId }, { createdAt: 0, updatedAt: 0, company: 0, __v: 0 }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      distanceMatrixFind,
      [
        {
          query: 'find',
          args: [{ company: companyId }, { origins: 1, destinations: 1, mode: 1, distance: 1, duration: 1 }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should not return draft pay as no matching contracts', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const auxiliaryId = new ObjectId();
    const aux = {
      _id: auxiliaryId,
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [{ startDate: '2019-02-23T00:00:00' }],
      administrative: { mutualFund: { has: true } },
    };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const payData = [{
      events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
      absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
      auxiliary: { _id: auxiliaryId },
    }];
    const prevPay = [{ auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 }];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };

    getEventsToPay.returns(payData);
    getSubscriptionsForPay.returns(subscriptions);
    getPreviousMonthPay.returns(prevPay);
    companyFindOne.returns(SinonMongoose.stubChainedQueries({ _id: companyId }, ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'sur' }], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'dm' }], ['lean']));
    computeAuxiliaryDraftPay.returns({ hoursBalance: 120 });
    getContract.returns(null);

    const result = await DraftPayHelper.computeDraftPay([aux], query, credentials);

    expect(result).toEqual([]);
    SinonMongoose.calledOnceWithExactly(
      companyFindOne,
      [
        {
          query: 'findOne',
          args: [
            { _id: companyId },
            {
              'rhConfig.phoneFeeAmount': 1,
              'rhConfig.transportSubs': 1,
              'rhConfig.amountPerKm': 1,
              'rhConfig.shouldPayHolidays': 1,
            },
          ],
        },
        { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      getPreviousMonthPay,
      [aux],
      subscriptions,
      query,
      [{ _id: 'sur' }],
      [{ _id: 'dm' }],
      companyId
    );
    sinon.assert.notCalled(computeAuxiliaryDraftPay);
  });

  it('should return draft pay by auxiliary', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectId();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' }, contracts: [{ _id: '1234567890' }] }];
    const payData = [
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      {
        events: [{ _id: new ObjectId(), events: [{ startDate: '2019-05-04T10:00:00' }] }],
        absences: [{ _id: new ObjectId(), events: [{ startDate: '2019-05-07T10:00:00' }] }],
        auxiliary: { _id: new ObjectId() },
      },
    ];
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectId(), hoursCounter: 25, diff: -3 },
    ];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };

    getEventsToPay.returns(payData);
    getSubscriptionsForPay.returns(subscriptions);
    getPreviousMonthPay.returns(prevPay);
    companyFindOne.returns(SinonMongoose.stubChainedQueries({ _id: companyId }, ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'sur' }], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'dm' }], ['lean']));
    computeAuxiliaryDraftPay.returns({ hoursBalance: 120 });
    getContract.returns({ _id: '1234567890' });

    const result = await DraftPayHelper.computeDraftPay(auxiliaries, query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    SinonMongoose.calledOnceWithExactly(
      companyFindOne,
      [
        {
          query: 'findOne',
          args: [
            { _id: companyId },
            {
              'rhConfig.phoneFeeAmount': 1,
              'rhConfig.transportSubs': 1,
              'rhConfig.amountPerKm': 1,
              'rhConfig.shouldPayHolidays': 1,
            },
          ],
        },
        { query: 'lean' }]
    );
    sinon.assert.calledOnceWithExactly(
      getPreviousMonthPay,
      auxiliaries,
      subscriptions,
      query,
      [{ _id: 'sur' }],
      [{ _id: 'dm' }],
      companyId
    );
    sinon.assert.calledOnceWithExactly(
      computeAuxiliaryDraftPay,
      { _id: auxiliaryId, sector: { name: 'Abeilles' }, contracts: [{ _id: '1234567890' }] },
      { _id: '1234567890' },
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      subscriptions,
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { _id: companyId },
      { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' },
      [{ _id: 'dm' }],
      [{ _id: 'sur' }]
    );
  });

  it('should return draft pay by auxiliary on january without computing previous pay', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };
    const query = { startDate: '2019-01-01T00:00:00', endDate: '2019-01-31T23:59:59' };
    const auxiliaryId = new ObjectId();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' }, contracts: [{ _id: '1234567890' }] }];
    const payData = [{
      events: [{ _id: auxiliaryId, events: [{ startDate: '2019-01-03T10:00:00' }] }],
      absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-01-06T10:00:00' }] }],
      auxiliary: { _id: auxiliaryId },
    }];
    const subId = new ObjectId();
    const subscriptions = { [subId]: { _id: new ObjectId(), service: { _id: new ObjectId() } } };

    getEventsToPay.returns(payData);
    getSubscriptionsForPay.returns(subscriptions);
    companyFindOne.returns(SinonMongoose.stubChainedQueries({ _id: companyId }, ['lean']));
    surchargeFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'sur' }], ['lean']));
    distanceMatrixFind.returns(SinonMongoose.stubChainedQueries([{ _id: 'dm' }], ['lean']));
    computeAuxiliaryDraftPay.returns({ hoursBalance: 120 });
    getContract.returns({ _id: '1234567890' });

    const result = await DraftPayHelper.computeDraftPay(auxiliaries, query, credentials);

    expect(result).toEqual([{ hoursBalance: 120 }]);
    SinonMongoose.calledOnceWithExactly(
      companyFindOne,
      [
        {
          query: 'findOne',
          args: [
            { _id: companyId },
            {
              'rhConfig.phoneFeeAmount': 1,
              'rhConfig.transportSubs': 1,
              'rhConfig.amountPerKm': 1,
              'rhConfig.shouldPayHolidays': 1,
            },
          ],
        },
        { query: 'lean' }]
    );
    sinon.assert.notCalled(getPreviousMonthPay);
    sinon.assert.calledOnceWithExactly(
      computeAuxiliaryDraftPay,
      { _id: auxiliaryId, sector: { name: 'Abeilles' }, contracts: [{ _id: '1234567890' }] },
      { _id: '1234567890' },
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-01-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-01-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      subscriptions,
      null,
      { _id: companyId },
      { startDate: '2019-01-01T00:00:00', endDate: '2019-01-31T23:59:59' },
      [{ _id: 'dm' }],
      [{ _id: 'sur' }]
    );
  });
});

describe('getDraftPay', () => {
  let getAuxiliariesToPay;
  let computeDraftPay;
  beforeEach(() => {
    getAuxiliariesToPay = sinon.stub(ContractRepository, 'getAuxiliariesToPay');
    computeDraftPay = sinon.stub(DraftPayHelper, 'computeDraftPay');
  });
  afterEach(() => {
    getAuxiliariesToPay.restore();
    computeDraftPay.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const end = moment(query.endDate).endOf('d').toDate();
    const credentials = { company: { _id: '1234567890', rhConfig: { shouldPayHolidays: false } } };
    getAuxiliariesToPay.returns([]);
    const result = await DraftPayHelper.getDraftPay(query, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledOnceWithExactly(
      getAuxiliariesToPay,
      {
        startDate: { $lte: end },
        $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
      },
      end,
      'pays',
      credentials.company._id
    );
    sinon.assert.notCalled(computeDraftPay);
  });

  it('should return draft pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const end = moment(query.endDate).endOf('d').toDate();
    const auxiliaries = [{ _id: new ObjectId(), sector: { name: 'Abeilles' } }];
    const credentials = { company: { _id: '1234567890' } };
    getAuxiliariesToPay.returns(auxiliaries);
    await DraftPayHelper.getDraftPay(query, credentials);

    sinon.assert.calledOnceWithExactly(
      getAuxiliariesToPay,
      {
        startDate: { $lte: end },
        $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
      },
      end,
      'pays',
      credentials.company._id
    );
    sinon.assert.calledOnceWithExactly(
      computeDraftPay,
      auxiliaries,
      { startDate: moment(query.startDate).startOf('d').toDate(), endDate: moment(query.endDate).endOf('d').toDate() },
      credentials
    );
  });
});
