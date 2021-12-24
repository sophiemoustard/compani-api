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

    find.returns(SinonMongoose.stubChainedQueries([[{ company: companyId, name: 'Coucou' }]], ['lean']));

    const result = await SurchargesHelper.list(credentials);
    expect(result).toEqual([{ company: companyId, name: 'Coucou' }]);

    SinonMongoose.calledWithExactly(find, [
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
  it('should return null if there is no surcharge', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T05:00:00', '2018-01-01T09:00:00', '05:00', '13:00');

    expect(res).toBe(null);
  });

  it('should return null if the surcharge is 0', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T05:00:00', '2018-01-01T09:00:00', '05:00', '13:00', 0);

    expect(res).toBe(null);
  });

  it('should return null if there is no intersection', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T05:00:00', '2018-01-01T09:00:00', '13:00', '17:00', 0);

    expect(res).toBe(null);
  });

  it('should return null if the intersection has a duration of 0', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T05:00:00', '2018-01-01T09:00:00', '09:00', '17:00', 25);

    expect(res).toBe(null);
  });

  it('should return a surcharge if they intersect', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T05:00:00', '2018-01-01T13:00:00', '09:00', '17:00', 25);

    expect(res).toEqual({
      startHour: moment('2018-01-01T09:00:00').toDate(),
      endHour: moment('2018-01-01T13:00:00').toDate(),
      percentage: 25,
    });
  });

  it('should return a surcharge if they intersect and surcharge start after end', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T23:00:00', '2018-01-02T01:00:00', '20:00', '06:00', 25);

    expect(res).toEqual({
      startHour: moment('2018-01-01T23:00:00').toDate(),
      endHour: moment('2018-01-02T01:00:00').toDate(),
      percentage: 25,
    });
  });

  it('should return a surcharge if the surcharge wraps the event', () => {
    const res = SurchargesHelper.getCustomSurcharge('2018-01-01T17:00:00', '2018-01-01T21:00:00', '09:00', '21:00', 12);

    expect(res).toEqual({
      startHour: moment('2018-01-01T17:00:00').toDate(),
      endHour: moment('2018-01-01T21:00:00').toDate(),
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
  });
  afterEach(() => {
    getCustomSurchargeStub.restore();
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
