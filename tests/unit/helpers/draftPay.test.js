const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const DraftPayHelper = require('../../../helpers/draftPay');
const Surcharge = require('../../../models/Surcharge');

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

describe('getMontBusinessDaysCount', () => {
  it('should call getBusinessDaysCountBetweenTwoDates', () => {
    const mock = sinon.mock(DraftPayHelper);
    mock.expects('getBusinessDaysCountBetweenTwoDates').once();
    DraftPayHelper.getMontBusinessDaysCount(new Date('2019/05/18'));

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
    mock.expects('getMontBusinessDaysCount').once().withArgs('2019-05-06').returns(16);

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
    mock.expects('getMontBusinessDaysCount').once().withArgs('2019-05-04');

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
    mock.expects('getMontBusinessDaysCount').twice();

    const result = DraftPayHelper.getContractMonthInfo(contract, query);

    expect(result).toBeDefined();
  });
});

describe('populateSurcharge', () => {
  it('should return subscription without change if no surcharge', async () => {
    const subscription = { service: { versions: [{ _id: '1234567890' }] } };
    const result = await DraftPayHelper.populateSurcharge(subscription);

    expect(result).toBeDefined();
    expect(result.service.versions[0].surcharge).not.toBeDefined();
    expect(result).toBe(subscription);
  });

  it('should populate surcharge', async () => {
    const stub = sinon.stub(Surcharge, 'findOne').returns(new Surcharge({ name: 'Toto' }));
    const subscription = { service: { versions: [{ _id: '1234567890', surcharge: 'qwertyuiop' }] } };
    const result = await DraftPayHelper.populateSurcharge(subscription);
    stub.restore();

    expect(result).toBeDefined();
    expect(result.service.versions[0].surcharge).toBeDefined();
  });
});

describe('computeCustomSurcharge', () => {
  const start = '09:00';
  const end = '12:00';
  const paidTransport = 30;
  it('case 1 : dates included between start and end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(9),
      endDate: (new Date('2019/03/12')).setHours(11),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(2.5);
  });

  it('case 2 : startDate included between start and end and endDate after end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(10),
      endDate: (new Date('2019/03/12')).setHours(13),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(2.5);
  });

  it('case 3 : startDate before start and endDate included between start and end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(8),
      endDate: (new Date('2019/03/12')).setHours(10),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(1);
  });

  it('case 4 : startDate before start and endDate after end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(7),
      endDate: (new Date('2019/03/12')).setHours(13),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end, paidTransport);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('case 4 : startDate and endDate before start', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(5),
      endDate: (new Date('2019/03/12')).setHours(7),
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
    const result = DraftPayHelper.applySurcharge(2, 'Luigi', 10, {});

    sinon.assert.called(getSurchargeDetails);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0, details: {} });
  });
});

describe('getSurchargeSplit', () => {
  let event;
  let surcharge = {};
  let applySurcharge;
  const paidTransport = 30;
  beforeEach(() => {
    applySurcharge = sinon.stub(DraftPayHelper, 'applySurcharge');
  });
  afterEach(() => {
    applySurcharge.restore();
  });

  it('should apply 25th of december surcharge', () => {
    event = { startDate: (new Date('2018/12/25')).setHours(9), endDate: (new Date('2018/12/25')).setHours(11) };
    surcharge = { twentyFifthOfDecember: 20 };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5 });
  });

  it('should not apply 25th of december surcharge', () => {
    event = { startDate: (new Date('2018/12/25')).setHours(9), endDate: (new Date('2018/12/25')).setHours(11) };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {} });
  });

  it('should apply 1st of May surcharge', () => {
    event = { startDate: (new Date('2018/05/01')).setHours(9), endDate: (new Date('2018/05/01')).setHours(11) };
    surcharge = { firstOfMay: 20 };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5 });
  });

  it('should not apply 1st of May surcharge', () => {
    event = { startDate: (new Date('2019/05/01')).setHours(9), endDate: (new Date('2019/05/01')).setHours(11) };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {} });
  });

  it('should apply holiday surcharge', () => {
    event = { startDate: (new Date('2019/05/08')).setHours(9), endDate: (new Date('2019/05/08')).setHours(11) };
    surcharge = { publicHoliday: 20 };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5 });
  });

  it('should not apply holiday surcharge', () => {
    event = { startDate: (new Date('2019/05/08')).setHours(9), endDate: (new Date('2019/05/08')).setHours(11) };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {} });
  });

  it('should apply saturday surcharge', () => {
    event = { startDate: (new Date('2019/04/27')).setHours(9), endDate: (new Date('2019/04/27')).setHours(11) };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5 });
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: (new Date('2019/04/27')).setHours(9), endDate: (new Date('2019/04/27')).setHours(11) };
    surcharge = { sunday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {} });
  });

  it('should apply sunday surcharge', () => {
    event = { startDate: (new Date('2019/04/28')).setHours(9), endDate: (new Date('2019/04/28')).setHours(11) };
    surcharge = { sunday: 20 };
    applySurcharge.returns({ surcharged: 2.5 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 2.5 });
  });

  it('should not apply sunday surcharge', () => {
    event = { startDate: (new Date('2019/04/28')).setHours(9), endDate: (new Date('2019/04/28')).setHours(11) };
    surcharge = { saturday: 20 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {} });
  });

  it('should apply evening surcharge', () => {
    const computeCustomSurcharge = sinon.stub(DraftPayHelper, 'computeCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    computeCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(computeCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0.5, details: {} });
    computeCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should apply custom surcharge', () => {
    const computeCustomSurcharge = sinon.stub(DraftPayHelper, 'computeCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { custom: 10, customEndTime: '20:00', customStartTime: '18:00' };
    computeCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    sinon.assert.called(computeCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0.5, details: {} });
    computeCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should not apply surcharge', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { saturday: 10 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {}, paidTransport);

    expect(result).toEqual({ surcharged: 0, notSurcharged: 2.5, details: {} });
  });
});
