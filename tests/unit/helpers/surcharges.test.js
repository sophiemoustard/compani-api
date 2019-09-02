const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');

const SurchargesHelper = require('../../../helpers/surcharges');

describe('getCustomSurcharge', () => {
  // Les dates sont triées, pour lire plus rapidement si il y a intersection.
  const dates = [
    '2018-01-01 01:00',
    '2018-01-01 05:00',
    '2018-01-01 09:00',
    '2018-01-01 13:00',
    '2018-01-01 17:00',
    '2018-01-01 21:00',
  ];
  const surchargeSteps = dates.map(date => moment(date).format('HH:mm'));

  it('should return null if there is no surcharge', () => {
    const result = SurchargesHelper.getCustomSurcharge(dates[1], dates[2], surchargeSteps[1], surchargeSteps[3]);
    expect(result).toBe(null);
  });

  it('should return null if the surcharge is 0', () => {
    const result = SurchargesHelper.getCustomSurcharge(dates[1], dates[2], surchargeSteps[1], surchargeSteps[3], 0);
    expect(result).toBe(null);
  });

  it('should return null if there is no intersection', () => {
    const result = SurchargesHelper.getCustomSurcharge(dates[1], dates[2], surchargeSteps[3], surchargeSteps[4], 0);
    expect(result).toBe(null);
  });

  it('should return null if the intersection has a duration of 0', () => {
    const result = SurchargesHelper.getCustomSurcharge(dates[1], dates[2], surchargeSteps[2], surchargeSteps[4], 25);
    expect(result).toBe(null);
  });

  it('should return a surcharge if they intersect', () => {
    const result = SurchargesHelper.getCustomSurcharge(dates[1], dates[3], surchargeSteps[2], surchargeSteps[4], 25);
    expect(result).toEqual({
      startHour: moment(dates[2]).toDate(),
      endHour: moment(dates[3]).toDate(),
      percentage: 25,
    });
  });

  it('should return a surcharge if the surcharge wraps the event', () => {
    const result = SurchargesHelper.getCustomSurcharge(dates[4], dates[5], surchargeSteps[2], surchargeSteps[5], 12);
    expect(result).toEqual({
      startHour: moment(dates[4]).toDate(),
      endHour: moment(dates[5]).toDate(),
      percentage: 12,
    });
  });
});

describe('getEventSurcharges', () => {
  let getCustomSurchargeStub;
  let emptySurcharge;
  let surchargeAllSet;

  beforeEach(() => {
    emptySurcharge = {
      twentyFifthOfDecember: 0,
      firstOfMay: 0,
      publicHoliday: 0,
      saturday: 0,
      sunday: 0,
      evening: 0,
      eveningEndTime: '22:00',
      eveningStartTime: '20:00',
      custom: 0,
      customStartTime: '17:00',
      customEndTime: '19:00',
    };

    surchargeAllSet = {
      twentyFifthOfDecember: 10,
      firstOfMay: 12,
      publicHoliday: 14,
      saturday: 16,
      sunday: 18,
      evening: 20,
      eveningEndTime: '22:00',
      eveningStartTime: '20:00',
      custom: 22,
      customStartTime: '17:00',
      customEndTime: '19:00',
    };

    getCustomSurchargeStub = sinon.stub(SurchargesHelper, 'getCustomSurcharge');
  });
  afterEach(() => {
    getCustomSurchargeStub.restore();
  });

  it('should return no surcharges if the surcharge is empty', () => {
    getCustomSurchargeStub.returnsArg(4);
    const event = {
      startDate: '2019-05-01T16:00:00.000',
      endDate: '2019-05-01T23:00:00.000',
    };
    getCustomSurchargeStub.returns();
    expect(SurchargesHelper.getEventSurcharges(event, emptySurcharge)).toEqual([]);
  });

  it('should return no surcharges if none match', () => {
    getCustomSurchargeStub.returns();
    const event = {
      startDate: '2019-05-03T16:00:00.000',
      endDate: '2019-05-03T23:00:00.000',
    };
    expect(SurchargesHelper.getEventSurcharges(event, surchargeAllSet)).toEqual([]);
  });

  const dailySurcharges = [
    { key: 'twentyFifthOfDecember', date: '2019-12-25', label: '25th of december', name: '25 Décembre' },
    { key: 'firstOfMay', date: '2019-05-01', label: '1st of May', name: '1er Mai' },
    { key: 'publicHoliday', date: '2019-07-14', label: 'holiday', name: 'Jour férié' },
    { key: 'saturday', date: '2019-08-17', label: 'saturday', name: 'Samedi' },
    { key: 'sunday', date: '2019-08-18', label: 'sunday', name: 'Dimanche' },
  ];

  dailySurcharges.forEach((dailySurcharge) => {
    const surcharge = { ...surchargeAllSet, [dailySurcharge.key]: 35 };
    const event = {
      startDate: moment(dailySurcharge.date).hour(16).toISOString(),
      endDate: moment(dailySurcharge.date).hour(18).toISOString(),
    };

    it(`should return one surcharge for ${dailySurcharge.label}`, () => {
      getCustomSurchargeStub.returnsArg(4);
      expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([{
        percentage: 35,
        name: dailySurcharge.name,
      }]);
    });
  });

  dailySurcharges.forEach((dailySurcharge) => {
    const surcharge = { ...emptySurcharge, [dailySurcharge.key]: 22 };
    const event = {
      startDate: moment('2019-06-03').hour(16).toISOString(),
      endDate: moment('2019-06-03').hour(23).toISOString(),
    };

    it(`should return no surcharge for ${dailySurcharge.label}`, () => {
      getCustomSurchargeStub.returnsArg(4);
      expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([]);
    });
  });

  it('should return holiday and not sunday surcharge', () => {
    getCustomSurchargeStub.returnsArg(4);
    const event = { startDate: '2019-07-14T07:00:00', endDate: '2019-07-14T09:00:00' };
    const surcharge = { sunday: 10, publicHoliday: 20 };
    expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([{
      percentage: 20,
      name: 'Jour férié',
    }]);
  });

  it('should return two surcharges with ranges', () => {
    getCustomSurchargeStub.onCall(0).returns({ percentage: 20 });
    getCustomSurchargeStub.onCall(1).returns({ percentage: 22 });
    const event = {
      startDate: '2019-04-18T01:00:00',
      endDate: '2019-04-18T02:00:00',
    };
    expect(SurchargesHelper.getEventSurcharges(event, surchargeAllSet))
      .toEqual([{ percentage: 20, name: 'Soirée' }, { percentage: 22, name: 'Personalisée' }]);
  });
});
