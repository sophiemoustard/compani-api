const expect = require('expect');
const sinon = require('sinon');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const Surcharge = require('../../../src/models/Surcharge');
const SurchargesHelper = require('../../../src/helpers/surcharges');
const SinonMongoose = require('../sinonMongoose');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Surcharge, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return a list of every surcharges from company', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    find.returns(SinonMongoose.stubChainedQueries([{ company: companyId, name: 'Coucou' }], ['lean']));

    const result = await SurchargesHelper.list(credentials);
    expect(result).toEqual([{ company: companyId, name: 'Coucou' }]);

    SinonMongoose.calledOnceWithExactly(find, [
      { query: 'find', args: [{ company: companyId }] },
      { query: 'lean' },
    ]);
  });
});

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Surcharge, 'create');
  });
  afterEach(() => {
    create.restore();
  });
  it('should create a surcharge', async () => {
    const companyId = new ObjectId();
    const credentials = { company: { _id: companyId } };

    await SurchargesHelper.create({ name: 'Salut toi' }, credentials);

    sinon.assert.calledOnceWithExactly(create, { name: 'Salut toi', company: companyId });
  });
});

describe('update', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Surcharge, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });
  it('should update a surcharge', async () => {
    const surchargeId = new ObjectId();

    await SurchargesHelper.update({ _id: surchargeId }, { name: 'Skusku' });

    sinon.assert.calledOnceWithExactly(updateOne, { _id: surchargeId }, { $set: { name: 'Skusku' } });
  });
});

describe('delete', () => {
  let deleteOne;
  beforeEach(() => {
    deleteOne = sinon.stub(Surcharge, 'deleteOne');
  });
  afterEach(() => {
    deleteOne.restore();
  });
  it('should delete a surcharge', async () => {
    const surchargeId = new ObjectId();

    await SurchargesHelper.delete({ _id: surchargeId });

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: surchargeId });
  });
});

describe('getCustomSurcharge', () => {
  it('should return [] if there is no surcharge', () => {
    const eventStart = '2018-01-01T05:00:00';
    const eventEnd = '2018-01-01T09:00:00';
    const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '05:00', '13:00');

    expect(res).toStrictEqual([]);
  });

  it('should return [] if the surcharge is 0', () => {
    const eventStart = '2018-01-01T05:00:00';
    const eventEnd = '2018-01-01T09:00:00';

    const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '05:00', '13:00', 0);

    expect(res).toStrictEqual([]);
  });

  describe('case end of surcharge is after start of surcharge', () => {
    it('should return [] if there is no intersection', () => {
      const eventStart = '2018-01-01T05:00:00';
      const eventEnd = '2018-01-01T10:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '13:00', '17:00', 10, 'Aprem');

      expect(res).toStrictEqual([]);
    });

    it('should return surcharge if there is an intersection with entire surcharge', () => {
      const eventStart = '2018-01-01T10:00:00';
      const eventEnd = '2018-01-01T20:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '13:00', '17:00', 10, 'Aprem');

      expect(res).toStrictEqual([{
        percentage: 10,
        name: 'Aprem',
        startHour: moment('2018-01-01T13:00:00').toDate(),
        endHour: moment('2018-01-01T17:00:00').toDate(),
      }]);
    });

    it('should return surcharge if there is an intersection with start of surcharge', () => {
      const eventStart = '2018-01-01T10:00:00';
      const eventEnd = '2018-01-01T15:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '13:00', '17:00', 10, 'Aprem');

      expect(res).toStrictEqual([{
        percentage: 10,
        name: 'Aprem',
        startHour: moment('2018-01-01T13:00:00').toDate(),
        endHour: moment('2018-01-01T15:00:00').toDate(),
      }]);
    });

    it('should return surcharge if there is an intersection with start of surcharge', () => {
      const eventStart = '2018-01-01T16:00:00';
      const eventEnd = '2018-01-01T20:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '13:00', '17:00', 10, 'Aprem');

      expect(res).toStrictEqual([{
        percentage: 10,
        name: 'Aprem',
        startHour: moment('2018-01-01T16:00:00').toDate(),
        endHour: moment('2018-01-01T17:00:00').toDate(),
      }]);
    });
  });

  describe('case end of surcharge is before start of surcharge (night surcharge)', () => {
    it('should return [] if there is no intersection', () => {
      const eventStart = '2018-01-01T07:00:00';
      const eventEnd = '2018-01-01T12:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '20:00', '07:00', 10, 'Soirée');

      expect(res).toStrictEqual([]);
    });

    it('should return a surcharge if intersect with beginning', () => {
      const eventStart = '2018-01-01T07:00:00';
      const eventEnd = '2018-01-01T23:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '20:00', '07:00', 10, 'Soirée');

      expect(res).toStrictEqual([{
        percentage: 10,
        name: 'Soirée',
        startHour: moment('2018-01-01T20:00:00').toDate(),
        endHour: moment('2018-01-01T23:00:00').toDate(),
      }]);
    });

    it('should return a surcharge if intersect with end', () => {
      const eventStart = '2018-01-01T05:00:00';
      const eventEnd = '2018-01-01T12:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '20:00', '07:00', 10, 'Soirée');

      expect(res).toStrictEqual([{
        percentage: 10,
        name: 'Soirée',
        startHour: moment('2018-01-01T05:00:00').toDate(),
        endHour: moment('2018-01-01T07:00:00').toDate(),
      }]);
    });

    it('should return two surcharges if intersect with both', () => {
      const eventStart = '2018-01-01T05:00:00';
      const eventEnd = '2018-01-01T23:00:00';

      const res = SurchargesHelper.getCustomSurcharge(eventStart, eventEnd, '20:00', '07:00', 10, 'Soirée');

      expect(res).toStrictEqual([
        {
          percentage: 10,
          name: 'Soirée',
          startHour: moment('2018-01-01T05:00:00').toDate(),
          endHour: moment('2018-01-01T07:00:00').toDate(),
        },
        {
          percentage: 10,
          name: 'Soirée',
          startHour: moment('2018-01-01T20:00:00').toDate(),
          endHour: moment('2018-01-01T23:00:00').toDate(),
        },
      ]);
    });
  });
});

describe('getHourlySurchargeList', () => {
  let getCustomSurcharge;
  beforeEach(() => {
    getCustomSurcharge = sinon.stub(SurchargesHelper, 'getCustomSurcharge');
  });

  afterEach(() => {
    getCustomSurcharge.restore();
  });

  it('should return [] if no evening surcharge and no custom surcharge', () => {
    const start = '2022-06-01T12:00:00';
    const end = '2022-06-01T15:00:00';
    getCustomSurcharge.onCall(0).returns([]);
    getCustomSurcharge.onCall(1).returns([]);
    const surcharge = {
      evening: 10,
      eveningStartTime: 20,
      eveningEndTime: 23,
      custom: 25,
      customStartTime: 12,
      customEndTime: 14,
    };

    const rep = SurchargesHelper.getHourlySurchargeList(start, end, surcharge);

    expect(rep).toStrictEqual([]);
    sinon.assert.calledWithExactly(getCustomSurcharge.getCall(0), start, end, 20, 23, 10, 'Soirée');
    sinon.assert.calledWithExactly(getCustomSurcharge.getCall(1), start, end, 12, 14, 25, 'Personnalisée');
  });

  it('should return surcharge info if has evening surcharge but no custom surcharge', () => {
    const start = '2022-06-01T19:00:00';
    const end = '2022-06-01T22:00:00';
    getCustomSurcharge.onCall(0).returns(
      [{ percentage: 10, startHour: '2022-06-01T20:00:00', endHour: '2022-06-01T22:00:00', name: 'Soirée' }]
    );
    getCustomSurcharge.onCall(1).returns([]);
    const surcharge = {
      evening: 10,
      eveningStartTime: 20,
      eveningEndTime: 23,
      custom: 25,
      customStartTime: 12,
      customEndTime: 14,
    };

    const rep = SurchargesHelper.getHourlySurchargeList(start, end, surcharge);

    expect(rep).toStrictEqual(
      [{ percentage: 10, startHour: '2022-06-01T20:00:00', endHour: '2022-06-01T22:00:00', name: 'Soirée' }]
    );
  });

  it('should return surcharge info if no evening surcharge but has custom surcharge', () => {
    const start = '2022-06-01T10:00:00';
    const end = '2022-06-01T17:00:00';
    getCustomSurcharge.onCall(1).returns(
      [{ percentage: 25, startHour: '2022-06-01T12:00:00', endHour: '2022-06-01T14:00:00', name: 'Personnalisée' }]
    );
    getCustomSurcharge.onCall(0).returns([]);
    const surcharge = {
      evening: 10,
      eveningStartTime: 20,
      eveningEndTime: 23,
      custom: 25,
      customStartTime: 12,
      customEndTime: 14,
    };

    const rep = SurchargesHelper.getHourlySurchargeList(start, end, surcharge);

    expect(rep).toStrictEqual(
      [{ percentage: 25, startHour: '2022-06-01T12:00:00', endHour: '2022-06-01T14:00:00', name: 'Personnalisée' }]
    );
  });

  it('should return surcharge info if has evening surcharge and custom surcharge', () => {
    const start = '2022-06-01T10:00:00';
    const end = '2022-06-01T22:00:00';
    getCustomSurcharge.onCall(0).returns(
      [{ percentage: 10, startHour: '2022-06-01T20:00:00', endHour: '2022-06-01T22:00:00', name: 'Soirée' }]
    );
    getCustomSurcharge.onCall(1).returns(
      [{ percentage: 25, startHour: '2022-06-01T12:00:00', endHour: '2022-06-01T14:00:00', name: 'Personnalisée' }]
    );
    const surcharge = {
      evening: 10,
      eveningStartTime: 20,
      eveningEndTime: 23,
      custom: 25,
      customStartTime: 12,
      customEndTime: 14,
    };

    const rep = SurchargesHelper.getHourlySurchargeList(start, end, surcharge);

    expect(rep).toStrictEqual([
      { percentage: 10, startHour: '2022-06-01T20:00:00', endHour: '2022-06-01T22:00:00', name: 'Soirée' },
      { percentage: 25, startHour: '2022-06-01T12:00:00', endHour: '2022-06-01T14:00:00', name: 'Personnalisée' },
    ]);
  });
});

describe('getDailySurcharge #tag', () => {
  const surcharge = {
    name: 'Default',
    saturday: 12,
    sunday: 25,
    publicHoliday: 100,
    twentyFifthOfDecember: 30,
    firstOfMay: 50,
    firstOfJanuary: 90,
  };

  it('should return null if no daily surcharge', () => {
    const start = moment('2022-06-17T12:00:00');
    const end = moment('2022-06-17T14:00:00');

    const rep = SurchargesHelper.getDailySurcharge(start, end, surcharge);

    expect(rep).toBe(null);
  });

  it('should return holiday surcharge if percentage is higher', () => {
    const start = moment('2022-01-01T12:00:00');
    const end = moment('2022-01-01T14:00:00');

    const rep = SurchargesHelper.getDailySurcharge(start, end, surcharge);

    expect(rep).toStrictEqual({
      percentage: 90,
      name: '1er Janvier',
      startHour: start.toDate(),
      endHour: end.toDate(),
    });
  });

  it('should return weekend surcharge if percentage is higher', () => {
    const specificSurcharge = {
      name: 'Default',
      saturday: 100,
      sunday: 25,
      publicHoliday: 17,
      twentyFifthOfDecember: 30,
      firstOfMay: 50,
      firstOfJanuary: 12,
    };
    const start = moment('2022-01-01T12:00:00');
    const end = moment('2022-01-01T14:00:00');

    const rep = SurchargesHelper.getDailySurcharge(start, end, specificSurcharge);

    expect(rep).toStrictEqual({
      percentage: 100,
      name: 'Samedi',
      startHour: start.toDate(),
      endHour: end.toDate(),
    });
  });
});

describe('getEventSurcharges', () => {
  let getCustomSurchargeStub;
  let emptySurcharge;
  let surchargeAllSet;
  let getHourlySurchargeList;
  let getDailySurchargeList;

  beforeEach(() => {
    emptySurcharge = {
      twentyFifthOfDecember: 0,
      firstOfMay: 0,
      firstOfJanuary: 0,
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
      firstOfJanuary: 13,
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
    getHourlySurchargeList = sinon.stub(SurchargesHelper, 'getHourlySurchargeList');
    getDailySurchargeList = sinon.stub(SurchargesHelper, 'getDailySurchargeList');
  });
  afterEach(() => {
    getCustomSurchargeStub.restore();
    getHourlySurchargeList.restore();
    getDailySurchargeList.restore();
  });

  it('should return the matching surcharge, even if surcharge values are all 0', () => {
    const event = {
      startDate: '2019-05-01T16:00:00.000',
      endDate: '2019-05-01T23:00:00.000',
    };

    getCustomSurchargeStub.returnsArg(4);
    getCustomSurchargeStub.returns();

    expect(SurchargesHelper.getEventSurcharges(event, emptySurcharge)).toEqual([{
      percentage: 0,
      name: '1er Mai',
    }]);
  });

  it('should return no surcharges if none match', () => {
    const event = {
      startDate: '2019-05-03T16:00:00.000',
      endDate: '2019-05-03T23:00:00.000',
    };

    getCustomSurchargeStub.returns();

    expect(SurchargesHelper.getEventSurcharges(event, surchargeAllSet)).toEqual([]);
  });

  const dailySurcharges = [
    { key: 'twentyFifthOfDecember', date: '2019-12-25', label: '25th of december', name: '25 Décembre' },
    { key: 'firstOfMay', date: '2019-05-01', label: '1st of May', name: '1er Mai' },
    { key: 'firstOfJanuary', date: '2019-01-01', label: '1st of January', name: '1er Janvier' },
    { key: 'publicHoliday', date: '2022-07-14', label: 'holiday', name: 'Jour férié' },
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

  it('should return the surchage with the highest level', () => {
    const event = { startDate: '2021-12-25T07:00:00', endDate: '2021-12-25T09:00:00' };
    const surcharge = { saturday: 10, twentyFifthOfDecember: 30 };

    getCustomSurchargeStub.returnsArg(4);

    expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([{
      percentage: 30,
      name: '25 Décembre',
    }]);
  });

  it('should return the surchage with the highest level, even if percentage is 0', () => {
    const event = { startDate: '2021-12-25T07:00:00', endDate: '2021-12-25T09:00:00' };
    const surcharge = { saturday: 10, twentyFifthOfDecember: 0 };

    getCustomSurchargeStub.returnsArg(4);

    expect(SurchargesHelper.getEventSurcharges(event, surcharge)).toEqual([{
      percentage: 0,
      name: '25 Décembre',
    }]);
  });

  it('should return two surcharges with ranges', () => {
    const event = {
      startDate: '2019-04-18T01:00:00',
      endDate: '2019-04-18T02:00:00',
    };

    getCustomSurchargeStub.onCall(0).returns({ percentage: 20 });
    getCustomSurchargeStub.onCall(1).returns({ percentage: 22 });

    expect(SurchargesHelper.getEventSurcharges(event, surchargeAllSet))
      .toEqual([{ percentage: 20, name: 'Soirée' }, { percentage: 22, name: 'Personalisée' }]);
  });
});
