const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectID } = require('mongodb');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const UtilsHelper = require('../../../src/helpers/utils');
const Company = require('../../../src/models/Company');
const Surcharge = require('../../../src/models/Surcharge');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const Pay = require('../../../src/models/Pay');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const EventRepository = require('../../../src/repositories/EventRepository');

require('sinon-mongoose');

describe('getBusinessDaysCountBetweenTwoDates', () => {
  it('Case 1. No sundays nor holidays in range', () => {
    const start = new Date('2019/05/21');
    const end = new Date('2019/05/23');
    const result = DraftPayHelper.getBusinessDaysCountBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('Case 2. Sundays in range', () => {
    const start = new Date('2019/05/18');
    const end = new Date('2019/05/23');
    const result = DraftPayHelper.getBusinessDaysCountBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toBe(5);
  });

  it('Case 3. Holidays in range', () => {
    const start = new Date('2019/05/07');
    const end = new Date('2019/05/09');
    const result = DraftPayHelper.getBusinessDaysCountBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toBe(2);
  });
});

describe('getMonthBusinessDaysCount', () => {
  it('should call getBusinessDaysCountBetweenTwoDates', () => {
    const mock = sinon.mock(DraftPayHelper);
    mock.expects('getBusinessDaysCountBetweenTwoDates').once();
    DraftPayHelper.getMonthBusinessDaysCount(new Date('2019/05/18'));

    mock.restore();
  });
});

describe('getContractMonthInfo', () => {
  let mock;
  beforeEach(() => {
    mock = sinon.mock(DraftPayHelper);
  });

  afterEach(() => {
    mock.restore();
  });

  it('Case 1. One version no sunday', () => {
    const contract = {
      versions: [
        { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-06', endDate: '2019-05-10' };
    mock.expects('getBusinessDaysCountBetweenTwoDates').once().withArgs(moment('2019-05-06'), moment('2019-05-10')).returns(4);
    mock.expects('getMonthBusinessDaysCount').once().withArgs('2019-05-06').returns(16);

    const result = DraftPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    expect(result.contractHours).toBeDefined();
    expect(result.contractHours).toBe(26);
    expect(result.workedDaysRatio).toBeDefined();
    expect(result.workedDaysRatio).toBe(1 / 4);
  });

  it('Case 2. One version and sunday included', () => {
    const contract = {
      versions: [
        { startDate: '2019-01-01', endDate: '2019-05-03', weeklyHours: 18 },
        { endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-04', endDate: '2019-05-10' };
    mock.expects('getBusinessDaysCountBetweenTwoDates').once().withArgs(moment('2019-05-04').startOf('d'), moment('2019-05-10'));
    mock.expects('getMonthBusinessDaysCount').once().withArgs('2019-05-04');

    const result = DraftPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
  });

  it('Case 3. Multiple versions', () => {
    const contract = {
      versions: [
        { startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-04-27', endDate: '2019-05-05' };
    mock.expects('getBusinessDaysCountBetweenTwoDates').twice();
    mock.expects('getMonthBusinessDaysCount').twice();

    const result = DraftPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
  });
});

describe('computeCustomSurcharge', () => {
  const start = '09:00';
  const end = '12:00';
  const paidTransport = 30;
  it('case 1 : dates included between start and end', async () => {
    const event = {
      startDate: '2019-03-12T09:00:00',
      endDate: '2019-03-12T11:00:00',
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(2.5);
  });

  it('case 2 : startDate included between start and end and endDate after end', async () => {
    const event = {
      startDate: '2019-03-12T10:00:00',
      endDate: '2019-03-12T13:00:00',
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(2.5);
  });

  it('case 3 : startDate before start and endDate included between start and end', async () => {
    const event = {
      startDate: '2019-03-12T08:00:00',
      endDate: '2019-03-12T10:00:00',
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(1);
  });

  it('case 4 : startDate before start and endDate after end', async () => {
    const event = {
      startDate: '2019-03-12T07:00:00',
      endDate: '2019-03-12T13:00:00',
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('case 4 : startDate and endDate before start', async () => {
    const event = {
      startDate: '2019-03-12T05:00:00',
      endDate: '2019-03-12T07:00:00',
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
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
    expect(result).toEqual({ '5d021ac76740b60f42af845b': { planName: 'Super Mario', Noel: { hours: 5, percentage: 35 } } });
  });

  it('Case 2. surcharge plan included in details but not surcharge type', () => {
    const surcharge = { _id: new ObjectID('5d021ac76740b60f42af845b'), name: 'Super Mario', Noel: 35 };
    const details = { '5d021ac76740b60f42af845b': { 10: { hours: 3 } } };
    const result = DraftPayHelper.getSurchargeDetails(2, surcharge, 'Noel', details);

    expect(result).toBeDefined();
    expect(result).toEqual({ '5d021ac76740b60f42af845b': { planName: 'Super Mario', 10: { hours: 3 }, Noel: { hours: 2, percentage: 35 } } });
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
    const result = DraftPayHelper.applySurcharge(2.8, 'Luigi', 10, {}, 10);

    sinon.assert.called(getSurchargeDetails);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 2.8, notSurcharged: 0, details: {}, paidKm: 10 });
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
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10 });
  });

  it('should not apply 25th of december surcharge', () => {
    event = { startDate: '2019-12-25T09:00:00', endDate: '2019-12-25T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 10 });
  });

  it('should apply 1st of May surcharge', () => {
    event = { startDate: '2019-05-01T09:00:00', endDate: '2019-05-01T11:00:00' };
    surcharge = { firstOfMay: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10 });
  });

  it('should not apply 1st of May surcharge', () => {
    event = { startDate: '2019-05-01T09:00:00', endDate: '2019-05-01T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 10 });
  });

  it('should apply holiday surcharge', () => {
    event = { startDate: '2019-05-08T09:00:00', endDate: '2019-05-08T11:00:00' };
    surcharge = { publicHoliday: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10 });
  });

  it('should not apply holiday surcharge', () => {
    event = { startDate: '2019-05-08T09:00:00', endDate: '2019-05-08T11:00:00' };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 10 });
  });

  it('should apply saturday surcharge', () => {
    event = { startDate: '2019-04-27T09:00:00', endDate: '2019-04-27T11:00:00' };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 2.5, paidKm: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5, paidKm: 10 });
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: '2019-04-27T09:00:00', endDate: '2019-04-27T11:00:00' };
    surcharge = { sunday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 10 });
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
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 10 });
  });

  it('should apply evening surcharge', () => {
    const computeCustomSurcharge = sinon.stub(DraftPayHelper, 'computeCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    computeCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(computeCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0.5, details: {}, paidKm: 10 });
    computeCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should apply custom surcharge', () => {
    const computeCustomSurcharge = sinon.stub(DraftPayHelper, 'computeCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    surcharge = { custom: 10, customEndTime: '20:00', customStartTime: '18:00' };
    computeCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(computeCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0.5, details: {}, paidKm: 10 });
    computeCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should not apply surcharge', () => {
    event = { startDate: '2019-04-23T18:00:00', endDate: '2019-04-23T20:00:00' };
    surcharge = { saturday: 10 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 10 });
  });
});

describe('getTransportInfo', () => {
  let getOrCreateDistanceMatrix;
  beforeEach(() => {
    getOrCreateDistanceMatrix = sinon.stub(DistanceMatrixHelper, 'getOrCreateDistanceMatrix');
  });
  afterEach(() => {
    getOrCreateDistanceMatrix.restore();
  });

  it('should return 0 if no origins', async () => {
    const distances = [];
    const result = await DraftPayHelper.getTransportInfo(distances, null, 'lalal', 'repos');

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if no destination', async () => {
    const distances = [];
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', null, 'repos');

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 0, duration: 0 });
  });

  it('should return 0 if no mode', async () => {
    const distances = [];
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'repos', null);

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
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'paradis', 'repos');

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 2, duration: 2 });
  });

  it('should call google maps api as no data found in database', async () => {
    const distances = [{ origins: 'lilili', destinations: 'enfer', mode: 'boulot', duration: 120 }];
    getOrCreateDistanceMatrix.resolves({ duration: 120, distance: 3000 });
    const result = await DraftPayHelper.getTransportInfo(distances, 'lalal', 'paradis', 'repos');

    expect(result).toBeDefined();
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
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
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
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
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
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      startDate: '2019-01-18T15:46:30.636Z',
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
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
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      startDate: '2019-01-18T15:46:30.636Z',
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
    };
    getTransportInfo.resolves({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    sinon.assert.calledWith(getTransportInfo, [], 'tamalou', 'jébobolà', 'driving');
  });

  it('should compute transit transport', async () => {
    const event = {
      hasFixedService: false,
      startDate: '2019-01-18T18:00:00',
      type: 'intervention',
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
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
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
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
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
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
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
      hasFixedService: false,
      type: 'intervention',
      endDate: '2019-01-18T15:00:00',
      customer: {
        contact: { address: { fullAddress: 'tamalou' } },
      },
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
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 12 });
    sinon.assert.notCalled(getSurchargeSplit);
  });

  it('should not call getSurchargeSplit if no surcharge', async () => {
    const service = { nature: 'hourly' };
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 12 });
    sinon.assert.notCalled(getSurchargeSplit);
  });

  it('should call getSurchargeSplit if hourly service with surcharge', async () => {
    const service = { surcharge: { sunday: 10 }, nature: 'hourly' };
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });
    getSurchargeSplit.returns({ surcharged: 10, notSurcharged: 2.5 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 10, notSurcharged: 2.5 });
    sinon.assert.calledWith(getSurchargeSplit, event, { sunday: 10 }, details, { distance: 12, duration: 30 });
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
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsHelper, 'getMatchingVersion');
    getEventHours = sinon.stub(DraftPayHelper, 'getEventHours');
  });

  afterEach(() => {
    getMatchingVersion.restore();
    getEventHours.restore();
  });

  it('should return 0 for all keys if no events', async () => {
    const result = await DraftPayHelper.getPayFromEvents([], [], [], {});

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
    const result = await DraftPayHelper.getPayFromEvents(events, [], [], query);

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
    const result = await DraftPayHelper.getPayFromEvents(events, [], surcharges, query);

    expect(result).toBeDefined();
    sinon.assert.calledWith(
      getMatchingVersion,
      '2019-07-12T09:00:00',
      { versions: [{ startDate: '2019-02-22T00:00:00' }], surcharge: surchargeId },
      'startDate'
    );
  });

  it('should return pay for exempted from charge service', async () => {
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
    getEventHours.returns({ surcharged: 2, notSurcharged: 5, details: { sunday: 10 }, paidKm: 5.8 });
    const result = await DraftPayHelper.getPayFromEvents(events, [], surcharges, query);

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
    });
    sinon.assert.calledWith(
      getEventHours,
      { ...events[0][0] },
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
    getEventHours.returns({ surcharged: 2, notSurcharged: 5, details: { sunday: 10 }, paidKm: 5.8 });
    const result = await DraftPayHelper.getPayFromEvents(events, [], surcharges, query);

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
    });
    sinon.assert.calledWith(
      getEventHours,
      { ...events[0][0] },
      false,
      { startDate: '2019-02-22T00:00:00', surcharge: { _id: surchargeId, sunday: 10 }, exemptFromCharges: false },
      {},
      []
    );
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
    getEventHours.onCall(0).returns({ surcharged: 2, notSurcharged: 5, details: {}, paidKm: 5.8 });
    getEventHours.onCall(1).returns({ surcharged: 4, notSurcharged: 0, details: {}, paidKm: 3.2 });
    getEventHours.onCall(2).returns({ surcharged: 2, notSurcharged: 5, details: {}, paidKm: 0 });

    const result = await DraftPayHelper.getPayFromEvents(events, [], surcharges, query);

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

  it('should return paid hours from daily absence with one version in contract', () => {
    const query = { startDate: '2019-05-01T07:00:00', endDate: '2019-05-31T07:00:00' };
    const absences = [
      { absenceNature: 'daily', startDate: '2019-05-18T07:00:00', endDate: '2019-05-18T22:00:00' },
      { absenceNature: 'daily', startDate: '2019-05-01T07:00:00', endDate: '2019-05-03T22:00:00' },
    ];
    const contract = { versions: [{ weeklyHours: 12 }] };

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
    const contract = { versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }] };

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
    const contract = { versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }] };

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
    const contract = { versions: [{ weeklyHours: 12 }, { weeklyHours: 24 }] };

    getMatchingVersion.returns({ weeklyHours: 12 });

    const result = DraftPayHelper.getPayFromAbsences(absences, contract, query);

    expect(result).toBeDefined();
    sinon.assert.calledWith(getMatchingVersion.getCall(0), moment(query.startDate).startOf('d'), contract, 'startDate');
  });
});

describe('getDraftPayByAuxiliary', () => {
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

  it('should not return draft pay as auxiliary does not have company contracts', async () => {
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [
        { startDate: '2019-02-23T00:00:00', status: 'contract_with_customer' },
      ],
      administrative: { mutualFund: { has: true } },
    };
    const events = [[]];
    const absences = [];
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = {};

    const result = await DraftPayHelper.getDraftPayByAuxiliary(auxiliary, events, absences, prevPay, company, query, [], []);
    expect(result).not.toBeDefined();
  });

  it('should not return draft pay as auxiliary does not have started contract', async () => {
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [
        { startDate: '2019-07-23T00:00:00', status: 'contract_with_customer' },
      ],
      administrative: { mutualFund: { has: true } },
    };
    const events = [[]];
    const absences = [];
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = {};

    const result = await DraftPayHelper.getDraftPayByAuxiliary(auxiliary, events, absences, prevPay, company, query, [], []);
    expect(result).not.toBeDefined();
  });

  it('should return draft pay for one auxiliary', async () => {
    const auxiliary = {
      _id: '1234567890',
      identity: { firstname: 'Hugo', lastname: 'Lloris' },
      sector: { name: 'La ruche' },
      contracts: [
        { startDate: '2019-05-13T00:00:00', status: 'contract_with_company' },
      ],
      administrative: { mutualFund: { has: true } },
    };
    const events = [[{ auxiliary: '1234567890' }]];
    const absences = [];
    const company = { rhConfig: { feeAmount: 37 } };
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const prevPay = { hoursCounter: 10, diff: 2 };

    getPayFromEvents.returns({ workedHours: 138, notSurchargedAndNotExempt: 15, surchargedAndNotExempt: 9 });
    getPayFromAbsences.returns(16);
    getContractMonthInfo.returns({ contractHours: 150, workedDaysRatio: 0.8 });
    getTransportRefund.returns(26.54);

    const result = await DraftPayHelper.getDraftPayByAuxiliary(auxiliary, events, absences, prevPay, company, query, [], []);
    expect(result).toBeDefined();
    expect(result).toEqual({
      auxiliaryId: '1234567890',
      auxiliary: { _id: '1234567890', identity: { firstname: 'Hugo', lastname: 'Lloris' }, sector: { name: 'La ruche' } },
      startDate: '2019-05-13T00:00:00',
      endDate: '2019-05-31T23:59:59',
      month: '05-2019',
      contractHours: 150,
      workedHours: 138,
      notSurchargedAndNotExempt: 15,
      surchargedAndNotExempt: 9,
      hoursBalance: 4,
      hoursCounter: 16,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: false,
      transport: 26.54,
      otherFees: 29.6,
      bonus: 0,
    });
  });
});

describe('getPreviousMonthPay', () => {
  let getAuxiliariesFromContracts;
  let getEventsToPay;
  let getAbsencesToPay;
  let findPay;
  let computePrevPayCounterDiff;

  beforeEach(() => {
    getAuxiliariesFromContracts = sinon.stub(ContractRepository, 'getAuxiliariesFromContracts');
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    getAbsencesToPay = sinon.stub(EventRepository, 'getAbsencesToPay');
    findPay = sinon.stub(Pay, 'find');
    computePrevPayCounterDiff = sinon.stub(DraftPayHelper, 'computePrevPayCounterDiff');
  });

  afterEach(() => {
    getAuxiliariesFromContracts.restore();
    getEventsToPay.restore();
    getAbsencesToPay.restore();
    findPay.restore();
    computePrevPayCounterDiff.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    getAuxiliariesFromContracts.returns([]);
    findPay.returns([]);

    const result = await DraftPayHelper.getPreviousMonthPay(query, [], []);

    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should not call getDraftPayByAuxiliary if no events, nor absences nor previous pay for auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    getAuxiliariesFromContracts.returns([{ _id: new ObjectID() }]);
    getEventsToPay.returns([{ _id: new ObjectID() }]);
    getAbsencesToPay.returns([{ _id: new ObjectID() }]);
    findPay.returns([{ auxiliary: new ObjectID() }]);

    const result = await DraftPayHelper.getPreviousMonthPay(query, [], []);

    expect(result).toBeDefined();
    sinon.assert.notCalled(computePrevPayCounterDiff);
  });

  it('should compute prev pay counter difference', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const events = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-04T10:00:00' }] },
    ];
    const absences = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-07T10:00:00' }] },
    ];
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23 },
      { auxiliary: new ObjectID(), hoursCounter: 25 },
    ];

    getAuxiliariesFromContracts.returns(auxiliaries);
    getEventsToPay.returns(events);
    getAbsencesToPay.returns(absences);
    findPay.returns(prevPay);

    const result = await DraftPayHelper.getPreviousMonthPay(query, [], []);

    expect(result).toBeDefined();
    sinon.assert.calledWith(
      computePrevPayCounterDiff,
      { _id: auxiliaryId, sector: { name: 'Abeilles' } },
      [{ startDate: '2019-05-03T10:00:00' }],
      [{ startDate: '2019-05-06T10:00:00' }],
      { auxiliary: auxiliaryId, hoursCounter: 23 },
      query,
      [],
      []
    );
  });
});

describe('getDraftPay', () => {
  let getAuxiliariesFromContracts;
  let getEventsToPay;
  let getAbsencesToPay;
  let companyMock;
  let findSurcharge;
  let findDistanceMatrix;
  let findPay;
  let getPreviousMonthPay;
  let getDraftPayByAuxiliary;

  beforeEach(() => {
    getAuxiliariesFromContracts = sinon.stub(ContractRepository, 'getAuxiliariesFromContracts');
    getEventsToPay = sinon.stub(EventRepository, 'getEventsToPay');
    getAbsencesToPay = sinon.stub(EventRepository, 'getAbsencesToPay');
    companyMock = sinon.mock(Company);
    findSurcharge = sinon.stub(Surcharge, 'find');
    findDistanceMatrix = sinon.stub(DistanceMatrix, 'find');
    findPay = sinon.stub(Pay, 'find');
    getPreviousMonthPay = sinon.stub(DraftPayHelper, 'getPreviousMonthPay');
    getDraftPayByAuxiliary = sinon.stub(DraftPayHelper, 'getDraftPayByAuxiliary');
  });

  afterEach(() => {
    getAuxiliariesFromContracts.restore();
    getEventsToPay.restore();
    getAbsencesToPay.restore();
    companyMock.restore();
    findSurcharge.restore();
    findDistanceMatrix.restore();
    findPay.restore();
    getPreviousMonthPay.restore();
    getDraftPayByAuxiliary.restore();
  });

  it('should return an empty array if no auxiliary', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    getAuxiliariesFromContracts.returns([]);
    companyMock.expects('findOne').chain('lean');
    findPay.returns([]);
    const result = await DraftPayHelper.getDraftPay([], [], query);

    companyMock.verify();
    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should return draft pay', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const events = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-04T10:00:00' }] },
    ];
    const absences = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-06T10:00:00' }] },
      { _id: new ObjectID(), events: [{ startDate: '2019-05-07T10:00:00' }] },
    ];
    const prevPay = [
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      { auxiliary: new ObjectID(), hoursCounter: 25, diff: -3 },
    ];
    const existingPay = [{ auxiliary: new ObjectID() }];

    getAuxiliariesFromContracts.returns(auxiliaries);
    getEventsToPay.returns(events);
    getAbsencesToPay.returns(absences);
    findSurcharge.returns([]);
    findDistanceMatrix.returns([]);
    findPay.returns(existingPay);
    getPreviousMonthPay.returns(prevPay);
    companyMock.expects('findOne').chain('lean').returns({});
    getDraftPayByAuxiliary.returns({ hoursBalance: 120 });
    const result = await DraftPayHelper.getDraftPay(query);

    expect(result).toBeDefined();
    expect(result).toEqual([{ hoursBalance: 120 }]);
    companyMock.verify();
    sinon.assert.calledWith(
      getDraftPayByAuxiliary,
      { _id: auxiliaryId, sector: { name: 'Abeilles' } },
      [{ startDate: '2019-05-03T10:00:00' }],
      [{ startDate: '2019-05-06T10:00:00' }],
      { auxiliary: auxiliaryId, hoursCounter: 23, diff: 2 },
      {},
      { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' },
      [],
      []
    );
  });

  it('should not compute draft pay if pay already exist in db', async () => {
    const query = { startDate: '2019-05-01T00:00:00', endDate: '2019-05-31T23:59:59' };
    const auxiliaryId = new ObjectID();
    const auxiliaries = [{ _id: auxiliaryId, sector: { name: 'Abeilles' } }];
    const events = [
      { _id: auxiliaryId, events: [{ startDate: '2019-05-03T10:00:00' }] },
    ];
    const existingPay = [{ auxiliary: auxiliaryId }];

    getAuxiliariesFromContracts.returns(auxiliaries);
    getEventsToPay.returns(events);
    getAbsencesToPay.returns([]);
    findSurcharge.returns([]);
    findDistanceMatrix.returns([]);
    findPay.returns(existingPay);
    getPreviousMonthPay.returns([]);
    companyMock.expects('findOne').chain('lean').returns({});

    const result = await DraftPayHelper.getDraftPay(query);

    expect(result).toBeDefined();
    sinon.assert.notCalled(getDraftPayByAuxiliary);
  });
});
