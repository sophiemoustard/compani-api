const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const UtilsHelper = require('../../../src/helpers/utils');
const ContractHelper = require('../../../src/helpers/contracts');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const EventRepository = require('../../../src/repositories/EventRepository');

require('sinon-mongoose');

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

    const result = DraftPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    expect(result.contractHours).toBe(104);
    expect(result.workedDaysRatio).toBe(1 / 4);
    sinon.assert.calledWithExactly(
      getDaysRatioBetweenTwoDates,
      moment('2019-05-06').startOf('M').toDate(),
      moment('2019-05-06').endOf('M').toDate()
    );
    sinon.assert.calledWithExactly(getContractInfo, versions[1], query, 4);
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
  it('Case 1. surcharge plan and type included in details', () => {
    const surcharge = { _id: new ObjectID('5d021ac76740b60f42af845b'), name: 'Super Mario', Noel: 35 };
    const details = { '5d021ac76740b60f42af845b': { Noel: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({
      '5d021ac76740b60f42af845b': { planName: 'Super Mario', Noel: { hours: 5, percentage: 35 } },
    });
  });

  it('Case 2. surcharge plan included in details but not surcharge type', () => {
    const surcharge = { _id: new ObjectID('5d021ac76740b60f42af845b'), name: 'Super Mario', Noel: 35 };
    const details = { '5d021ac76740b60f42af845b': { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({
      '5d021ac76740b60f42af845b': { planName: 'Super Mario', 10: { hours: 3 }, Noel: { hours: 2, percentage: 35 } },
    });
  });

  it('Case 3. surcharge plan and type not included in details', () => {
    const surcharge = { _id: new ObjectID('5d021ac76740b60f42af845b'), name: 'Luigi', Noel: 35 };
    const details = { '5d021ac76385b60f22af644c': { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({
      '5d021ac76385b60f22af644c': { 10: { hours: 3 } },
      '5d021ac76740b60f42af845b': { planName: 'Luigi', Noel: { hours: 2, percentage: 35 } },
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
    const result = DraftPayHelper.applySurcharge(2.8, 'Luigi', 10, {}, { duration: 30, distance: 10 });

    sinon.assert.called(getSurchargeDetails);
    expect(result).toBeDefined();
    expect(result).toEqual({
      surcharged: 2.8,
      notSurcharged: 0,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });
});

describe('getSurchargeSplit', () => {
  let event;
  let surcharge = {};
  let applySurcharge;
  const paidTransport = { duration: 30, distance: 10 };
  beforeEach(() => {
    applySurcharge = sinon.stub(DraftPayHelper, 'applySurcharge');
  });
  afterEach(() => {
    applySurcharge.restore();
  });

  it('should apply 25th of december surcharge', () => {
    event = { startDate: '2019-12-25T09:00:00', endDate: '2019-12-25T11:00:00' };
    surcharge = { twentyFifthOfDecember: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
  });

  it('should not apply 25th of december surcharge', () => {
    event = { startDate: '2019-12-25T09:00:00', endDate: '2019-12-25T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });

  it('should apply 1st of May surcharge', () => {
    event = { startDate: '2019-05-01T09:00:00', endDate: '2019-05-01T11:00:00' };
    surcharge = { firstOfMay: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
  });

  it('should not apply 1st of May surcharge', () => {
    event = { startDate: '2019-05-01T09:00:00', endDate: '2019-05-01T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });

  it('should apply holiday surcharge', () => {
    event = { startDate: '2019-05-08T09:00:00', endDate: '2019-05-08T11:00:00' };
    surcharge = { publicHoliday: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
  });

  it('should not apply holiday surcharge', () => {
    event = { startDate: '2019-05-08T09:00:00', endDate: '2019-05-08T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });

  it('should apply saturday surcharge', () => {
    event = { startDate: '2019-04-27T09:00:00', endDate: '2019-04-27T11:00:00' };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10, paidTransportHours: 0.5 });
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: '2019-04-27T09:00:00', endDate: '2019-04-27T11:00:00' };
    surcharge = { sunday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });

  it('should apply sunday surcharge', () => {
    event = { startDate: '2019-04-28T09:00:00', endDate: '2019-04-28T11:00:00' };
    surcharge = { sunday: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10 });
  });

  it('should not apply sunday surcharge', () => {
    event = { startDate: '2019-04-28T09:00:00', endDate: '2019-04-28T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });

  it('should apply evening surcharge', () => {
    const applyCustomSurcharge = sinon.stub(DraftPayHelper, 'applyCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    applyCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applyCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({
      surcharged: 2,
      notSurcharged: 0.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
    applyCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should apply custom surcharge', () => {
    const applyCustomSurcharge = sinon.stub(DraftPayHelper, 'applyCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    surcharge = { custom: 10, customEndTime: '20:00', customStartTime: '18:00' };
    applyCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applyCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({
      surcharged: 2,
      notSurcharged: 0.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
    applyCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should not apply surcharge', () => {
    event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    surcharge = { saturday: 10 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 10,
      paidTransportHours: 0.5,
    });
  });
});

describe('getTransportInfo', () => {
  const companyId = new ObjectID();
  let getOrCreateDistanceMatrix;
  beforeEach(() => {
    getOrCreateDistanceMatrix = sinon.stub(DistanceMatrixHelper, 'getOrCreateDistanceMatrix');
  });
  afterEach(() => {
    getOrCreateDistanceMatrix.restore();
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
    getOrCreateDistanceMatrix.resolves({ duration: 120, distance: 3000 });
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'paradis', 'repos', companyId);

    expect(result).toBeDefined();
    const query = {
      origins: 'lalal',
      destinations: 'paradis',
      mode: 'repos',
    };
    sinon.assert.calledWithExactly(getOrCreateDistanceMatrix, query, companyId);
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

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if prevEvent has fixed service', async () => {
    const event = { hasFixedService: false };
    const prevEvent = { hasFixedService: true };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if event has fixed service', async () => {
    const event = { hasFixedService: true };
    const prevEvent = { hasFixedService: false };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if no address in event', async () => {
    const event = {
      type: 'intervention',
      hasFixedService: false,
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
    };
    const prevEvent = {
      type: 'intervention',
      hasFixedService: false,
      startDate: '2019-01-18T15:46:30.636Z',
      address: { fullAddress: 'tamalou' },
    };
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
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
    expect(result).toEqual({ distance: 0, duration: 0 });
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
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should compute driving transport', async () => {
    const event = {
      hasFixedService: false,
      type: 'intervention',
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
      address: { fullAddress: 'jébobolà' },
      company: new ObjectID(),
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      startDate: '2019-01-18T15:46:30.636Z',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    sinon.assert.calledWithExactly(getTransportInfo, [], 'tamalou', 'jébobolà', 'driving', event.company);
  });

  it('should compute transit transport', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T18:00:00',
      type: 'intervention',
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
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

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 10, duration: 40 });
  });

  it('should return break duration', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T16:10:00',
      type: 'intervention',
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
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

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 10, duration: 70 });
  });

  it('should return transport duration', async () => {
    const event = {
      startDate: '2019-01-18T18:00:00',
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
      endDate: '2019-01-18T15:00:00',
      address: { fullAddress: 'tamalou' },
    };
    getTransportInfo.resolves({ distance: 10, duration: 60 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toEqual({ distance: 10, duration: 60 });
  });

  it('should return transport duration if break is shorter than transport duration', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T15:30:00',
      type: 'intervention',
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
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

    expect(result).toEqual({ distance: 8, duration: 60 });
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
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 12,
      paidTransportHours: 0.5,
    });
    sinon.assert.notCalled(getSurchargeSplit);
  });

  it('should not call getSurchargeSplit if no surcharge', async () => {
    const service = { nature: 'hourly' };
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({
      surcharged: 0,
      notSurcharged: 2.5,
      details: {},
      paidKm: 12,
      paidTransportHours: 0.5,
    });
    sinon.assert.notCalled(getSurchargeSplit);
  });

  it('should call getSurchargeSplit if hourly service with surcharge', async () => {
    const service = { surcharge: { sunday: 10 }, nature: 'hourly' };
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });
    getSurchargeSplit.returns({ surcharged: 10, notSurcharged: 2.5, paidTransportHours: 0.5 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 10, notSurcharged: 2.5, paidTransportHours: 0.5 });
    sinon.assert.calledWithExactly(getSurchargeSplit, event, { sunday: 10 }, details, { distance: 12, duration: 30 });
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
    const result = await DraftPayHelper.getPayFromEvents([], {}, [], [], {});

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
    });
    sinon.assert.notCalled(getMatchingVersion);
    sinon.assert.notCalled(getEventHours);
  });

  it('should return 0 for all keys if one event linked to fixed service', async () => {
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: true,
        subscription: {
          service: {
            nature: 'fixed',
            versions: [{ startDate: '2019-02-22T00:00:00' }],
          },
        },
      }],
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };
    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, [], [], query);

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
      internalHours: 0,
      paidTransportHours: 0,
    });
    sinon.assert.notCalled(getMatchingVersion);
    sinon.assert.notCalled(getEventHours);
  });

  it('should get matching service version for intervention', async () => {
    const surchargeId = new ObjectID();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: {
          service: {
            versions: [{ startDate: '2019-02-22T00:00:00' }],
            surcharge: surchargeId,
          },
        },
      }],
    ];
    const surcharges = [
      { _id: surchargeId, sunday: 10 },
      { _id: new ObjectID(), sunday: 14 },
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.returns({ startDate: '2019-02-22T00:00:00', surcharge: surchargeId });
    getEventHours.returns({ surcharged: 2, notSurcharged: 5, details: {}, paidKm: 5.8 });
    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, [], surcharges, query);

    expect(result).toBeDefined();
    sinon.assert.calledWithExactly(
      getMatchingVersion,
      '2019-07-12T09:00:00',
      { versions: [{ startDate: '2019-02-22T00:00:00' }], surcharge: surchargeId },
      'startDate'
    );
  });

  it('should return pay for event exempted from charge service', async () => {
    const surchargeId = new ObjectID();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: {
          service: {
            versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: true }],
            surcharge: surchargeId,
          },
        },
      }],
    ];
    const surcharges = [
      { _id: surchargeId, sunday: 10 },
      { _id: new ObjectID(), sunday: 14 },
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.returns({ startDate: '2019-02-22T00:00:00', surcharge: surchargeId, exemptFromCharges: true });
    getEventHours.returns({
      surcharged: 2,
      notSurcharged: 5,
      details: { sunday: 10 },
      paidKm: 5.8,
      paidTransportHours: 2,
    });
    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, [], surcharges, query);

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
      internalHours: 0,
      paidTransportHours: 2,
    });
    sinon.assert.calledWithExactly(
      getEventHours,
      { ...events[0][0], auxiliary },
      false,
      { startDate: '2019-02-22T00:00:00', surcharge: { _id: surchargeId, sunday: 10 }, exemptFromCharges: true },
      {},
      []
    );
  });

  it('should return pay for not exempted from charge service', async () => {
    const surchargeId = new ObjectID();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: {
          service: {
            versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }],
            surcharge: surchargeId,
          },
        },
      }],
    ];
    const surcharges = [
      { _id: surchargeId, sunday: 10 },
      { _id: new ObjectID(), sunday: 14 },
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.returns({ startDate: '2019-02-22T00:00:00', surcharge: surchargeId, exemptFromCharges: false });
    getEventHours.returns({
      surcharged: 2,
      notSurcharged: 5,
      details: { sunday: 10 },
      paidKm: 5.8,
      paidTransportHours: 3,
    });
    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, [], surcharges, query);

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
      paidTransportHours: 3,
      internalHours: 0,
    });
    sinon.assert.calledWithExactly(
      getEventHours,
      { ...events[0][0], auxiliary },
      false,
      { startDate: '2019-02-22T00:00:00', surcharge: { _id: surchargeId, sunday: 10 }, exemptFromCharges: false },
      {},
      []
    );
  });

  it('should return pay for internal hour', async () => {
    const surchargeId = new ObjectID();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-01T11:00:00',
        type: 'internalHour',
      }],
    ];
    const surcharges = [
      { _id: surchargeId, sunday: 10 },
      { _id: new ObjectID(), sunday: 14 },
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getEventHours.returns({
      surcharged: 0,
      notSurcharged: 5,
      details: {},
      paidKm: 5.8,
      paidTransportHours: 2,
    });
    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, [], surcharges, query);

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
      internalHours: 5,
      paidTransportHours: 2,
    });
    sinon.assert.calledWithExactly(
      getEventHours,
      { ...events[0][0], auxiliary },
      false,
      null,
      {},
      []
    );
    sinon.assert.notCalled(getMatchingVersion);
  });

  it('should return pay from multiple events', async () => {
    const surchargeId = new ObjectID();
    const events = [
      [{
        startDate: '2019-07-12T09:00:00',
        endDate: '2019-07-12T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: {
          service: {
            versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }],
            surcharge: surchargeId,
          },
        },
      }],
      [{
        startDate: '2019-07-13T09:00:00',
        endDate: '2019-07-13T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: {
          service: {
            versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }],
            surcharge: surchargeId,
          },
        },
      }],
      [{
        startDate: '2019-07-14T09:00:00',
        endDate: '2019-07-14T11:00:00',
        type: 'intervention',
        hasFixedService: false,
        subscription: {
          service: {
            versions: [{ startDate: '2019-02-22T00:00:00', exemptFromCharges: false }],
            surcharge: surchargeId,
          },
        },
      }],
    ];
    const surcharges = [
      { _id: surchargeId, sunday: 10 },
      { _id: new ObjectID(), sunday: 14 },
    ];
    const query = { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' };

    getMatchingVersion.onCall(0).returns({ exemptFromCharges: false });
    getMatchingVersion.onCall(1).returns({ exemptFromCharges: true });
    getMatchingVersion.onCall(2).returns({ exemptFromCharges: true });
    getEventHours.onCall(0).returns({
      surcharged: 2,
      notSurcharged: 5,
      details: {},
      paidKm: 5.8,
      paidTransportHours: 3,
    });
    getEventHours.onCall(1).returns({
      surcharged: 4,
      notSurcharged: 0,
      details: {},
      paidKm: 3.2,
      paidTransportHours: 0,
    });
    getEventHours.onCall(2).returns({
      surcharged: 2,
      notSurcharged: 5,
      details: {},
      paidKm: 0,
      paidTransportHours: 1,
    });

    const result = await DraftPayHelper.getPayFromEvents(events, auxiliary, [], surcharges, query);

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
      internalHours: 0,
      paidTransportHours: 4,
    });
  });
});

describe('getPayFromAbsences', () => {
  let getMatchingVersion;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
  });
  afterEach(() => {
    getMatchingVersion.restore();
  });

  it('should return 0 if no absences', () => {
    const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
    const result = DraftPayHelper.getPayFromAbsences([], {}, query);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  describe('no contract change on this month', () => {
    it('should return paid hours from daily absence with one version in contract', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' },
        { absenceNature: 'daily', startDate: '2019-05-01T07:00:00', endDate: '2019-05-03T22:00:00' },
      ];
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(6);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('should return paid hours from work accident and illness absences ', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        {
          absenceNature: 'daily',
          absence: 'illness',
          startDate: '2019-05-18T12:00:00',
          endDate: '2019-05-18T22:00:00',
        },
        {
          absenceNature: 'daily',
          absence: 'work_accident',
          startDate: '2019-05-01T14:00:00',
          endDate: '2019-05-03T22:00:00',
        },
      ];
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(6);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('should return paid hours from daily absence with two versions in contract', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' },
        { absenceNature: 'daily', startDate: '2019-05-01T07:00:00', endDate: '2019-05-03T22:00:00' },
      ];
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      };

      getMatchingVersion.onCall(0).returns({ weeklyHours: 12 });
      getMatchingVersion.onCall(1).returns({ weeklyHours: 24 });
      getMatchingVersion.onCall(2).returns({ weeklyHours: 24 });
      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(10);
      sinon.assert.called(getMatchingVersion);
    });

    it('should return paid hours from hourly absence', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'hourly', startDate: '2019-05-18T10:00:00', endDate: '2019-05-18T12:00:00' },
      ];
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      };

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(2);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('should only consider in query range event days', () => {
      const query = { startDate: '2019-05-02T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'daily', startDate: '2019-04-18T10:00:00', endDate: '2019-05-18T12:00:00' },
      ];
      const contract = {
        startDate: '2019-02-18T07:00:00',
        endDate: '2019-07-18T22:00:00',
        versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }],
      };

      getMatchingVersion.returns({ weeklyHours: 12 });

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      sinon.assert.calledWithExactly(
        getMatchingVersion.getCall(0),
        moment(query.startDate).startOf('d'), contract,
        'startDate'
      );
    });
  });

  describe('contract begins or ends during this month', () => {
    it('contract begins in middle of absence', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'daily', startDate: '2019-05-02T07:00:00', endDate: '2019-05-06T22:00:00' },
      ];
      const contract = { startDate: '2019-05-03T07:00:00', versions: [{ weeklyHours: 12 }] };

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(6);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('contract ends in middle of absence', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'daily', startDate: '2019-05-02T07:00:00', endDate: '2019-05-06T22:00:00' },
      ];
      const contract = {
        startDate: '2019-04-03T07:00:00',
        endDate: '2019-05-04T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(6);
      sinon.assert.notCalled(getMatchingVersion);
    });

    it('contract ends during an entire month of absence', () => {
      const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
      const absences = [
        { absenceNature: 'daily', startDate: '2019-03-02T10:00:00', endDate: '2019-06-18T12:00:00' },
      ];
      const contract = {
        startDate: '2019-04-18T07:00:00',
        endDate: '2019-05-18T22:00:00',
        versions: [{ weeklyHours: 12 }],
      };

      const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

      expect(result).toBeDefined();
      expect(result).toBe(28);
      sinon.assert.notCalled(getMatchingVersion);
    });
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
      administrative: { mutualFund: { has: true } },
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
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };

    getPayFromEvents.returns({ workedHours: 138, notSurchargedAndNotExempt: 15, surchargedAndNotExempt: 9 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 150, workedDaysRatio: 0.8, holidaysHours: 3 });
    getTransportRefund.returns(26.54);

    const result = await DraftPayHelper.computeBalance(auxiliary, contract, events, company, query, [], []);
    expect(result).toBeDefined();
    expect(result).toEqual({
      contractHours: 150,
      absencesHours: 16,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 7,
      transport: 26.54,
      otherFees: 29.6,
      hoursToWork: 131,
      holidaysHours: 3,
    });
    sinon.assert.calledWithExactly(getPayFromEvents, [events.events[1]], auxiliary, [], [], query);
    sinon.assert.calledWithExactly(getPayFromAbsences, [events.absences[0], events.absences[1]], contract, query);
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
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };

    getPayFromEvents.returns({ workedHours: 0, notSurchargedAndNotExempt: 0, surchargedAndNotExempt: 0 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 0, workedDaysRatio: 8, holidaysHours: 0 });
    getTransportRefund.returns(26.54);

    await DraftPayHelper.computeBalance(auxiliary, contract, events, company, query, [], []);
    sinon.assert.calledWithExactly(getPayFromEvents, [events.events[0]], auxiliary, [], [], query);
    sinon.assert.calledWithExactly(
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
      contracts: [
        { startDate: '2019-05-13T00:00:00' },
      ],
      administrative: { mutualFund: { has: true } },
    };
    const contract = { startDate: '2019-05-13T00:00:00' };
    const events = { events: [[{ auxiliary: '1234567890' }]], absences: [] };
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = { hoursCounter: 10, diff: { hoursBalance: 2 } };
    const computedPay = {
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 6,
      hoursCounter: 16,
      transport: 26.54,
      otherFees: 29.6,
      bonus: 0,
    };
    computeBalance.returns(computedPay);
    const result =
      await DraftPayHelper.computeAuxiliaryDraftPay(aux, contract, events, prevPay, company, query, [], []);
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
    sinon.assert.calledWithExactly(
      computeBalance,
      aux,
      { startDate: '2019-05-13T00:00:00' },
      events,
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
        qwertyuiop: {
          evenings: { hours: 23 },
          saturdays: { hours: 23 },
        },
        asdfghjkl: { christmas: { hours: 5 } },
      },
    };
    const prevPay = {
      surchargedAndExemptDetails: [
        {
          planId: 'qwertyuiop',
          evenings: { hours: 2 },
          sundays: { hours: 3 },
        },
        { planId: 'zxcvbnm', evenings: { hours: 4 } },
      ],
    };
    const detailType = 'surchargedAndExemptDetails';

    const result = DraftPayHelper.computePrevPayDetailDiff(hours, prevPay, detailType);

    expect(result).toEqual({
      qwertyuiop: {
        evenings: { hours: 21 },
        saturdays: { hours: 23 },
        sundays: { hours: -3 },
      },
      asdfghjkl: { christmas: { hours: 5 } },
      zxcvbnm: { evenings: { hours: -4 } },
    });
  });

  it('should compute previous pay if hours is defined but not prevPay', () => {
    const hours = {
      surchargedAndExemptDetails: {
        qwertyuiop: {
          evenings: { hours: 23 },
          saturdays: { hours: 23 },
        },
        asdfghjkl: { christmas: { hours: 5 } },
      },
    };
    const prevPay = {
      surchargedAndExemptDetails: [],
    };
    const detailType = 'surchargedAndExemptDetails';

    const result = DraftPayHelper.computePrevPayDetailDiff(hours, prevPay, detailType);

    expect(result).toEqual({
      qwertyuiop: {
        evenings: { hours: 23 },
        saturdays: { hours: 23 },
      },
      asdfghjkl: { christmas: { hours: 5 } },
    });
  });

  it('should compute previous pay if prevPay is defined but not hours', () => {
    const hours = {};
    const prevPay = {
      surchargedAndExemptDetails: [
        {
          planId: 'qwertyuiop',
          evenings: { hours: 2 },
          sundays: { hours: 3 },
        },
        { planId: 'zxcvbnm', evenings: { hours: 4 } },
      ],
    };
    const detailType = 'surchargedAndExemptDetails';

    const result = DraftPayHelper.computePrevPayDetailDiff(hours, prevPay, detailType);

    expect(result).toEqual({
      qwertyuiop: {
        evenings: { hours: -2 },
        sundays: { hours: -3 },
      },
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
    const events = [{ _id: new ObjectID() }];

    getContractMonthInfo.returns({ contractHours: 34 });
    getPayFromEvents.returns({
      workedHours: 24,
      notSurchargedAndNotExempt: 12,
      surchargedAndNotExempt: 3,
      surchargedAndNotExemptDetails: {},
      notSurchargedAndExempt: 6,
      surchargedAndExempt: 3,
      surchargedAndExemptDetails: {},
      internalHours: 0,
      paidTransportHours: 0,
    });
    getPayFromAbsences.returns(5);
    computePrevPayDetailDiff.returnsArg(2);

    const result = await DraftPayHelper.computePrevPayDiff(auxiliary, events, null, query, [], []);

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
  });

  it('should return diff with prevPay', async () => {
    const query = { startDate: '2019-09-01T00:00:00', endDate: '2019-09-30T23:59:59' };
    const auxiliary = { _id: '1234567890', contracts: [{ _id: 'poiuytre' }] };
    const events = [{ _id: new ObjectID() }];
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

    getPayFromEvents.returns({
      workedHours: 24,
      notSurchargedAndNotExempt: 12,
      surchargedAndNotExempt: 3,
      surchargedAndNotExemptDetails: {},
      notSurchargedAndExempt: 6,
      surchargedAndExempt: 3,
      surchargedAndExemptDetails: {},
      internalHours: 2,
      paidTransportHours: 4,
    });
    getPayFromAbsences.returns(-2);
    computePrevPayDetailDiff.returnsArg(2);

    const result = await DraftPayHelper.computePrevPayDiff(auxiliary, events, prevPay, query, [], []);

    expect(result).toEqual({
      auxiliary: '1234567890',
      diff: {
        workedHours: -2,
        notSurchargedAndNotExempt: 0,
        surchargedAndNotExempt: 1,
        surchargedAndNotExemptDetails: 'surchargedAndNotExemptDetails',
        notSurchargedAndExempt: -2,
        surchargedAndExempt: -1,
        surchargedAndExemptDetails: 'surchargedAndExemptDetails',
        hoursBalance: -4,
        internalHours: 1,
        paidTransportHours: 1,
        absencesHours: -2,
      },
      hoursCounter: 3,
    });
  });

  it('should not compute diff on future month', async () => {
    const query = { startDate: moment().startOf('M').toISOString(), endDate: moment().endOf('M').toISOString() };
    const auxiliary = { _id: '1234567890', contracts: [{ _id: 'poiuytre' }] };
    const events = [{ _id: new ObjectID() }];

    const result = await DraftPayHelper.computePrevPayDiff(auxiliary, events, null, query, [], []);
    expect(result).toEqual({ diff: {}, auxiliary: '1234567890', hoursCounter: 0 });
    sinon.assert.notCalled(getContractMonthInfo);
    sinon.assert.notCalled(getPayFromEvents);
    sinon.assert.notCalled(getPayFromAbsences);
    sinon.assert.notCalled(computePrevPayDetailDiff);
  });
});

describe('getPreviousMonthPay', () => {
  const auxiliaryId = new ObjectID();
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
    getEventsToPay.returns([]);

    const result = await DraftPayHelper.getPreviousMonthPay(auxiliaries, query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should compute prev pay counter difference', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' }, prevPay: { _id: '1234567890' } }];
    const events = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-04T10:00:00' }] },
    ];
    const absences = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-07T10:00:00' }] },
    ];
    const payData = { events, absences, auxiliary: { _id: auxiliaryId } };

    getEventsToPay.returns([payData]);

    const result = await DraftPayHelper.getPreviousMonthPay(auxiliaries, query, [], []);

    expect(result).toBeDefined();
    sinon.assert.called(computePrevPayDiff);
  });
});

describe('computeDraftPayByAuxiliary', () => {
  let getEventsToPay;
  let companyMock;
  let surchargeMock;
  let distanceMatrixMock;
  let getPreviousMonthPay;
  let computeAuxiliaryDraftPay;
  let getContract;
  beforeEach(() => {
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    companyMock = sinon.mock(Company);
    surchargeMock = sinon.mock(Surcharge);
    distanceMatrixMock = sinon.mock(DistanceMatrix);
    getPreviousMonthPay = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    computeAuxiliaryDraftPay = sinon.stub(DraftPayHelper, 'computeAuxiliaryDraftPay');
    getContract = sinon.stub(DraftPayHelper, 'getContract');
  });
  afterEach(() => {
    getEventsToPay.restore();
    companyMock.restore();
    surchargeMock.restore();
    distanceMatrixMock.restore();
    getPreviousMonthPay.restore();
    computeAuxiliaryDraftPay.restore();
    getContract.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    companyMock.expects('findOne').chain('lean').returns({});
    surchargeMock.expects('find').chain('lean').returns([]);
    distanceMatrixMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('lean')
      .returns([]);
    const result = await DraftPayHelper.computeDraftPayByAuxiliary([], query, credentials);

    sinon.assert.calledOnce(getPreviousMonthPay);
    expect(result).toBeDefined();
    expect(result).toEqual([]);
    companyMock.verify();
    surchargeMock.verify();
    distanceMatrixMock.verify();
  });

  it('should not return draft pay as auxiliary does not matching contracts', async () => {
    const aux = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [{ startDate: '2019-02-23T00:00:00' }],
      administrative: { mutualFund: { has: true } },
    };
    const contract = { startDate: '2019-02-23T00:00:00' };
    const events = { events: [[]], absences: [] };
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = {};

    getContract.returns(null);

    const result =
      await DraftPayHelper.computeAuxiliaryDraftPay(aux, contract, events, prevPay, company, query, [], []);
    expect(result).toBeUndefined();
  });

  it('should return draft pay by auxiliary', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' }, contracts: [{ _id: '1234567890' }] }];
    const payData = [
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      {
        events: [{ _id: new ObjectID(), events: [{ startDate: '2019-05-04T10:00:00' }] }],
        absences: [{ _id: new ObjectID(), events: [{ startDate: '2019-05-07T10:00:00' }] }],
        auxiliary: { _id: new ObjectID() },
      },
    ];
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectID(), hoursCounter: 25, diff: -3 },
    ];

    getEventsToPay.returns(payData);
    getPreviousMonthPay.returns(prevPay);
    companyMock.expects('findOne').chain('lean').returns({});
    surchargeMock.expects('find').chain('lean').returns([]);
    distanceMatrixMock
      .expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('lean')
      .returns([]);
    computeAuxiliaryDraftPay.returns({ hoursBalance: 120 });
    getContract.returns({ _id: '1234567890' });
    const result = await DraftPayHelper.computeDraftPayByAuxiliary(auxiliaries, query, credentials);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    companyMock.verify();
    surchargeMock.verify();
    distanceMatrixMock.verify();
    sinon.assert.calledWithExactly(
      computeAuxiliaryDraftPay,
      { _id: auxiliaryId, sector: { name: 'Abeilles' }, contracts: [{ _id: '1234567890' }] },
      { _id: '1234567890' },
      {
        events: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] }],
        absences: [{ _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] }],
        auxiliary: { _id: auxiliaryId },
      },
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      {},
      { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' },
      [],
      []
    );
  });
});

describe('getDraftPay', () => {
  let getAuxiliariesToPay;
  let computeDraftPayByAuxiliary;
  beforeEach(() => {
    getAuxiliariesToPay = sinon.stub(ContractRepository, 'getAuxiliariesToPay');
    computeDraftPayByAuxiliary = sinon.stub(DraftPayHelper, 'computeDraftPayByAuxiliary');
  });
  afterEach(() => {
    getAuxiliariesToPay.restore();
    computeDraftPayByAuxiliary.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const end = moment(query.endDate).endOf('d').toDate();
    const credentials = { company: { _id: '1234567890' } };
    getAuxiliariesToPay.returns([]);
    const result = await DraftPayHelper.getDraftPay(query, credentials);

    expect(result).toEqual([]);
    sinon.assert.calledWithExactly(
      getAuxiliariesToPay,
      {
        startDate: { $lte: end },
        $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
      },
      end,
      'pays',
      credentials.company._id
    );
    sinon.assert.notCalled(computeDraftPayByAuxiliary);
  });

  it('should return draft pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const end = moment(query.endDate).endOf('d').toDate();
    const auxiliaries = [{ _id: new ObjectID(), sector: { name: 'Abeilles' } }];
    const credentials = { company: { _id: '1234567890' } };
    getAuxiliariesToPay.returns(auxiliaries);
    await DraftPayHelper.getDraftPay(query, credentials);

    sinon.assert.calledWithExactly(
      getAuxiliariesToPay,
      {
        startDate: { $lte: end },
        $or: [{ endDate: null }, { endDate: { $exists: false } }, { endDate: { $gt: end } }],
      },
      end,
      'pays',
      credentials.company._id
    );
    sinon.assert.calledWithExactly(
      computeDraftPayByAuxiliary,
      auxiliaries,
      { startDate: moment(query.startDate).startOf('d').toDate(), endDate: moment(query.endDate).endOf('d').toDate() },
      credentials
    );
  });
});
