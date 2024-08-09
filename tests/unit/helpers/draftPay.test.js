const { expect } = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const moment = require('../../../src/extensions/moment');
const DraftPayHelper = require('../../../src/helpers/draftPay');
const DistanceMatrixHelper = require('../../../src/helpers/distanceMatrix');
const UtilsHelper = require('../../../src/helpers/utils');

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
