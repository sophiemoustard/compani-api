const expect = require('expect');
const sinon = require('sinon');
const DraftPayHelper = require('../../../helpers/draftPay');
const Surcharge = require('../../../models/Surcharge');

describe('getContractHours', () => {
  it('Case 1. One version no sunday', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01T00:00:00.000Z', endDate: '2019-05-04T00:00:00.000Z', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04T00:00:00.000Z', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-06T00:00:00.000Z', endDate: '2019-05-10T00:00:00.000Z' };

    const result = DraftPayHelper.getContractHours(contract, query);

    expect(result).toBeDefined();
    expect(result).toBe(20);
  });

  it('Case 2. One version and sunday included', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01T00:00:00.000Z', endDate: '2019-05-04T00:00:00.000Z', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04T00:00:00.000Z', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-04T00:00:00.000Z', endDate: '2019-05-10T00:00:00.000Z' };

    const result = DraftPayHelper.getContractHours(contract, query);

    expect(result).toBeDefined();
    expect(result).toBe(24);
  });

  it('Case 3. Multiple versions', () => {
    const contract = {
      versions: [
        { isActive: false, startDate: '2019-01-01T00:00:00.000Z', endDate: '2019-05-04T00:00:00.000Z', weeklyHours: 18 },
        { isActive: true, endDate: '', startDate: '2019-05-04T00:00:00.000Z', weeklyHours: 24 },
      ],
    };
    const query = { startDate: '2019-05-01T00:00:00.000Z', endDate: '2019-05-10T00:00:00.000Z' };

    const result = DraftPayHelper.getContractHours(contract, query);

    expect(result).toBeDefined();
    expect(result).toBe(33);
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
  it('case 1 : dates included between start and end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(9),
      endDate: (new Date('2019/03/12')).setHours(11),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end);
    expect(result).toBeDefined();
    expect(result).toBe(2);
  });

  it('case 2 : startDate included between start and end and endDate after end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(8),
      endDate: (new Date('2019/03/12')).setHours(10),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end);
    expect(result).toBeDefined();
    expect(result).toBe(1);
  });

  it('case 3 : startDate before start and endDate included between start and end', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(10),
      endDate: (new Date('2019/03/12')).setHours(13),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end);
    expect(result).toBeDefined();
    expect(result).toBe(2);
  });

  it('case 4 : startDate before start and endDate after endDate', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(7),
      endDate: (new Date('2019/03/12')).setHours(13),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end);
    expect(result).toBeDefined();
    expect(result).toBe(3);
  });

  it('case 4 : startDate and endDate before start', async () => {
    const event = {
      startDate: (new Date('2019/03/12')).setHours(5),
      endDate: (new Date('2019/03/12')).setHours(7),
    };

    const result = DraftPayHelper.computeCustomSurcharge(event, start, end);
    expect(result).toBeDefined();
    expect(result).toBe(0);
  });
});

describe('applySurcharge', () => {
  it('Case 1. surcharge included in details', () => {
    const result = DraftPayHelper.getSurchargeDetails(2, 10, { 10: 3 });

    expect(result).toBeDefined();
    expect(result).toEqual({ 10: 5 });
  });

  it('Case 2. surcharge not included in details', () => {
    const result = DraftPayHelper.getSurchargeDetails(2, 10, { 15: 3 });

    expect(result).toBeDefined();
    expect(result).toEqual({ 10: 2, 15: 3 });
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
    const result = DraftPayHelper.applySurcharge(2, 10, {});

    sinon.assert.called(getSurchargeDetails);
    expect(result).toBeDefined();
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0, details: {} });
  });
});

describe('getSurchargeSplit', () => {
  let event;
  let surcharge = {};
  let applySurcharge;
  beforeEach(() => {
    applySurcharge = sinon.stub(DraftPayHelper, 'applySurcharge');
  });
  afterEach(() => {
    applySurcharge.restore();
  });

  it('should apply 25th of december surcharge', () => {
    event = { startDate: (new Date('2018/12/25')).setHours(9), endDate: (new Date('2018/12/25')).setHours(11) };
    surcharge = { twentyFifthOfDecember: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 10 });
  });

  it('should not apply 25th of december surcharge', () => {
    event = { startDate: (new Date('2018/12/25')).setHours(9), endDate: (new Date('2018/12/25')).setHours(11) };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2, details: {} });
  });

  it('should apply 1st of May surcharge', () => {
    event = { startDate: (new Date('2018/05/01')).setHours(9), endDate: (new Date('2018/05/01')).setHours(11) };
    surcharge = { firstOfMay: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 10 });
  });

  it('should not apply 1st of May surcharge', () => {
    event = { startDate: (new Date('2019/05/01')).setHours(9), endDate: (new Date('2019/05/01')).setHours(11) };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2, details: {} });
  });

  it('should not apply holiday surcharge', () => {
    event = { startDate: (new Date('2019/05/08')).setHours(9), endDate: (new Date('2019/05/08')).setHours(11) };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2, details: {} });
  });

  it('should apply saturday surcharge', () => {
    event = { startDate: (new Date('2019/04/27')).setHours(9), endDate: (new Date('2019/04/27')).setHours(11) };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 10 });
  });

  it('should not apply saturday surcharge', () => {
    event = { startDate: (new Date('2019/04/27')).setHours(9), endDate: (new Date('2019/04/27')).setHours(11) };
    surcharge = { sunday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2, details: {} });
  });

  it('should apply sunday surcharge', () => {
    event = { startDate: (new Date('2019/04/28')).setHours(9), endDate: (new Date('2019/04/28')).setHours(11) };
    surcharge = { sunday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.called(applySurcharge);
    expect(result).toEqual({ surcharged: 10 });
  });

  it('should not apply sunday surcharge', () => {
    event = { startDate: (new Date('2019/04/28')).setHours(9), endDate: (new Date('2019/04/28')).setHours(11) };
    surcharge = { saturday: 20 };
    applySurcharge.returns({ surcharged: 10 });
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.notCalled(applySurcharge);
    expect(result).toEqual({ surcharged: 0, notSurcharged: 2, details: {} });
  });

  it('should apply evening surcharge', () => {
    const computeCustomSurcharge = sinon.stub(DraftPayHelper, 'computeCustomSurcharge');
    const getSurchargeDetails = sinon.stub(DraftPayHelper, 'getSurchargeDetails');
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { evening: 10, eveningEndTime: '20:00', eveningStartTime: '18:00' };
    computeCustomSurcharge.returns(2);
    getSurchargeDetails.returns({});
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.called(computeCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0, details: {} });
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
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    sinon.assert.called(computeCustomSurcharge);
    sinon.assert.called(getSurchargeDetails);
    expect(result).toEqual({ surcharged: 2, notSurcharged: 0, details: {} });
    computeCustomSurcharge.restore();
    getSurchargeDetails.restore();
  });

  it('should not apply surcharge', () => {
    event = { startDate: (new Date('2019/04/23')).setHours(18), endDate: (new Date('2019/04/23')).setHours(20) };
    surcharge = { saturday: 10 };
    const result = DraftPayHelper.getSurchargeSplit(event, surcharge, {});

    expect(result).toEqual({ surcharged: 0, notSurcharged: 2, details: {} });
  });
});
