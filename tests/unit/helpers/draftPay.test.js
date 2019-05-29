const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const DraftPayHelper = require('../../../helpers/draftPay');
const DistanceMatrixHelper = require('../../../helpers/distanceMatrix');
const UtilsPayHelper = require('../../../helpers/utils');

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
        { isActive: false, startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-06', endDate: '2019-05-10' };
    mock.expects('getBusinessDaysCountBetweenTwoDates').once().withArgs(moment('2019-05-06'), moment('2019-05-10')).returns(4);
    mock.expects('getMonthBusinessDaysCount').once().withArgs('2019-05-06').returns(16);

    const result = DraftPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
    expect(result.contractHours).toBeDefined();
    expect(result.contractHours).toBe(25.98);
    expect(result.workedDaysRatio).toBeDefined();
    expect(result.workedDaysRatio).toBe(1 / 4);
  });

  it('Case 2. One version and sunday included', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
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
        { isActive: false, startDate: '2019-01-01', endDate: '2019-05-04', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04', weeklyHours: 24 },
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
    const result = DraftPayHelper.getSurchargeDetails(2, 'Super Mario', 'Noel', { 'Super Mario': { Noel: 3 } });

    expect(result).toBeDefined();
    expect(result).toEqual({ 'Super Mario': { Noel: 5 } });
  });

  it('Case 2. surcharge plan included in details but not surcharge type', () => {
    const result = DraftPayHelper.getSurchargeDetails(2, 'Super Mario', 'Noel', { 'Super Mario': { 10: 3 } });

    expect(result).toBeDefined();
    expect(result).toEqual({ 'Super Mario': { 10: 3, Noel: 2 } });
  });

  it('Case 3. surcharge plan and type not included in details', () => {
    const result = DraftPayHelper.getSurchargeDetails(2, 'Luigi', 'Noel', { 'Super Mario': { 10: 3 } });

    expect(result).toBeDefined();
    expect(result).toEqual({ 'Super Mario': { 10: 3 }, Luigi: { Noel: 2 } });
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
      distance: 2000
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

  it('should compute driving transport', async () => {
    const event = {
      type: 'intervention',
      auxiliary: {
        administrative: { transportInvoice: { transportType: 'private' } },
      },
      customer: {
        contact: { address: { fullAddress: 'jébobolà' } },
      },
    };
    const prevEvent = {
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
    const event = { startDate: '2019-01-18T18:00:00' };
    const prevEvent = { endDate: '2019-01-18T15:00:00' };
    getTransportInfo.resolves({ distance: 10, duration: 40 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 10, duration: 40 });
  });

  it('should return break duration', async () => {
    const event = { startDate: '2019-01-18T16:10:00' };
    const prevEvent = { endDate: '2019-01-18T15:00:00' };
    getTransportInfo.resolves({ distance: 10, duration: 60 });
    const result = await DraftPayHelper.getPaidTransportInfo(event, prevEvent, []);

    expect(result).toBeDefined();
    expect(result).toEqual({ distance: 10, duration: 70 });
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
  });

  it('should not call getSurchargeSplit if fixed service', async () => {
    const service = { nature: 'fixed' };
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 12 });
  });

  it('should not call getSurchargeSplit if no surcharge', async () => {
    const service = { nature: 'hourly' };
    getPaidTransportInfo.returns({ distance: 12, duration: 30 });

    const result = await DraftPayHelper.getEventHours(event, prevEvent, service, details, distanceMatrix);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {}, paidKm: 12 });
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
    const auxiliary = {};
    const company = {};
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no subvention', () => {
    const auxiliary = { administrative: { transportInvoice: { transportType: 'public' } } };
    const company = {};
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no zipcode', () => {
    const auxiliary = { administrative: { transportInvoice: { transportType: 'public' } } };
    const company = { rhConfig: { transportSubs: [] } };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return 0 as no matching subvention', () => {
    const auxiliary = {
      administrative: { transportInvoice: { transportType: 'public' } },
      contact: { address: { zipCode: '75' } },
    };
    const company = {
      rhConfig: { transportSubs: [{ department: '92', price: 10 }] }
    };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(0);
  });

  it('should return transport refund', () => {
    const auxiliary = {
      administrative: { transportInvoice: { transportType: 'public' } },
      contact: { address: { zipCode: '75' } },
    };
    const company = {
      rhConfig: { transportSubs: [{ department: '75', price: 10 }] }
    };
    const result = DraftPayHelper.getTransportRefund(auxiliary, company, workedDaysRatio);

    expect(result).toBeDefined();
    expect(result).toBe(4);
  });
});

describe('getPayFromAbsences', () => {
  let getMatchingVersion;
  beforeEach(() => {
    getMatchingVersion = sinon.stub(UtilsPayHelper, 'getMatchingVersion');
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
