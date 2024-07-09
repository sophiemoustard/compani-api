const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const UtilsHelper = require('../../../src/helpers/utils');
const ContractHelper = require('../../../src/helpers/contracts');
const { INTERNAL_HOUR } = require('../../../src/helpers/constants');

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
    const event = { startDate: '2023-05-08T09:00:00', endDate: '2023-05-08T11:00:00' };
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
