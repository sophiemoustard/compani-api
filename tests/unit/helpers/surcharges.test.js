/* eslint-disable no-loop-func */
const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');

const SurchargesHelper = require('../../../helpers/surcharges');

describe('getCustomSurcharge', () => {
  const timeRange = moment.range('2018-01-01 00:00', '2018-01-01 23:00');
  const steps = Array.from(timeRange.by('h'));
  const surchargeSteps = steps.map(step => step.format('HH:mm'));

  it('should return undefined if there is no surcharge', () => {
    const result = SurchargesHelper.getCustomSurcharge(steps[1], steps[2], surchargeSteps[1], surchargeSteps[3]);
    expect(result).toBe(undefined);
  });

  it('should return undefined if the surcharge is 0', () => {
    const result = SurchargesHelper.getCustomSurcharge(steps[1], steps[2], surchargeSteps[1], surchargeSteps[3], 0);
    expect(result).toBe(undefined);
  });

  it('should return undefined if there is no intersection', () => {
    const result = SurchargesHelper.getCustomSurcharge(steps[1], steps[2], surchargeSteps[3], surchargeSteps[4], 0);
    expect(result).toBe(undefined);
  });

  it('should return undefined if the intersection has a duration of 0', () => {
    const result = SurchargesHelper.getCustomSurcharge(steps[1], steps[2], surchargeSteps[2], surchargeSteps[4], 25);
    expect(result).toBe(undefined);
  });

  it('should return a surcharge if they intersect', () => {
    const result = SurchargesHelper.getCustomSurcharge(steps[1], steps[3], surchargeSteps[2], surchargeSteps[4], 25);
    expect(result).toEqual({
      startHour: steps[2].toDate(),
      endHour: steps[3].toDate(),
      percentage: 25,
    });
  });

  it('should return a surcharge if the surcharge wraps the event', () => {
    const result = SurchargesHelper.getCustomSurcharge(steps[4], steps[5], surchargeSteps[2], surchargeSteps[5], 12);
    expect(result).toEqual({
      startHour: steps[4].toDate(),
      endHour: steps[5].toDate(),
      percentage: 12,
    });
  });
});

describe('getEventSurcharges', () => {
  const dailySurcharges = [
    { key: 'twentyFifthOfDecember', date: '2019-12-25', label: '25th of december' },
    { key: 'firstOfMay', date: '2019-05-01', label: '1st of May' },
    { key: 'publicHoliday', date: '2019-07-14', label: 'holiday' },
    { key: 'saturday', date: '2019-08-17', label: 'saturday' },
    { key: 'sunday', date: '2019-08-18', label: 'sunday' },
  ];
  let getCustomSurchargeStub;
  let surcharge;
  let emptySurcharge;
  let event;

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

    surcharge = {
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
    event = { startDate: moment('2019-05-01').hour(16), endDate: moment('2019-05-01').hour(23) };
  });

  beforeEach(() => {
    getCustomSurchargeStub = sinon.stub(SurchargesHelper, 'getCustomSurcharge');
    getCustomSurchargeStub.returnsArg(4);
  });
  afterEach(() => {
    getCustomSurchargeStub.restore();
  });

  it('should return no surcharges if the surcharge is empty', () => {
    const keys = [
      'twentyFifthOfDecember',
      'firstOfMay',
      'publicHoliday',
      'saturday',
      'sunday',
      'evening',
      'custom',
    ];
    for (const key of keys) surcharge[key] = 0;
    getCustomSurchargeStub.returns();
    expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([]);
  });

  it('should return no surcharges if none match', () => {
    event.startDate.day(4);
    event.endDate.day(4);
    surcharge.evening = undefined;
    surcharge.custom = undefined;
    expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([]);
  });

  for (const dailySurcharge of dailySurcharges) {
    it(`should return one surcharge for ${dailySurcharge.label}`, () => {
      surcharge[dailySurcharge.key] = 35;
      event.startDate = moment(dailySurcharge.date).hour(16);
      event.endDate = moment(dailySurcharge.date).hour(18);
      expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([{
        percentage: 35,
      }]);
    });

    it(`should return no surcharge for ${dailySurcharge.label}`, () => {
      emptySurcharge[dailySurcharge.key] = 22;
      event = { startDate: moment('2019-06-03').hour(16), endDate: moment('2019-06-03').hour(23) };
      expect(SurchargesHelper.getEventSurcharges(event, emptySurcharge)).toEqual([]);
    });
  }

  it('should return holiday and not sunday surcharge', () => {
    event = { startDate: '2019-07-14T07:00:00', endDate: '2019-07-14T09:00:00' };
    surcharge = { sunday: 10, publicHoliday: 20 };
    expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([{
      percentage: 20,
    }]);
  });

  it('should return two surcharges with ranges', () => {
    event.startDate = moment().hour(1);
    event.endDate = moment().hour(2);
    expect(SurchargesHelper.getEventSurcharges(event, surcharge))
      .toEqual([20, 22]);
  });
});
