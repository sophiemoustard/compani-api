const expect = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const omit = require('lodash/omit');
const pick = require('lodash/pick');
const UtilsHelper = require('../../../src/helpers/utils');

describe('getLastVersion', () => {
  it('should return the last version based on the date key', () => {
    const versions = [
      { startDate: '2021-09-21T00:00:00', createdAt: '2021-09-21T00:00:00', _id: 1 },
      { startDate: '2021-09-24T00:00:00', createdAt: '2021-09-18T00:00:00', _id: 2 },
    ];

    expect(UtilsHelper.getLastVersion(versions, 'startDate')).toBeDefined();
    expect(UtilsHelper.getLastVersion(versions, 'startDate')._id).toEqual(2);
    expect(UtilsHelper.getLastVersion(versions, 'createdAt')).toBeDefined();
    expect(UtilsHelper.getLastVersion(versions, 'createdAt')._id).toEqual(1);
  });

  it('should return null if versions is empty', () => {
    expect(UtilsHelper.getLastVersion([], 'toto')).toBeNull();
  });

  it('should return the single element if versions only contains one element', () => {
    const versions = [{ startDate: '2021-09-21T00:00:00', createdAt: '2021-09-21T00:00:00', _id: 1 }];

    const result = UtilsHelper.getLastVersion(versions, 'startDate');

    expect(result).toBeDefined();
    expect(result._id).toEqual(1);
  });
});

describe('getFirstVersion', () => {
  it('should return the first version based on the date key', () => {
    const versions = [
      { startDate: '2021-09-21T00:00:00', createdAt: '2021-09-21T00:00:00', _id: 1 },
      { startDate: '2021-09-24T00:00:00', createdAt: '2021-09-18T00:00:00', _id: 2 },
    ];

    expect(UtilsHelper.getFirstVersion(versions, 'startDate')).toBeDefined();
    expect(UtilsHelper.getFirstVersion(versions, 'startDate')._id).toEqual(1);
    expect(UtilsHelper.getFirstVersion(versions, 'createdAt')).toBeDefined();
    expect(UtilsHelper.getFirstVersion(versions, 'createdAt')._id).toEqual(2);
  });

  it('should return null if versions is empty', () => {
    expect(UtilsHelper.getFirstVersion([], 'toto')).toBeNull();
  });

  it('should return the single element if versions only contains one element', () => {
    const versions = [{ startDate: '2021-09-21T00:00:00', createdAt: '2021-09-21T00:00:00', _id: 1 }];

    const result = UtilsHelper.getFirstVersion(versions, 'startDate');

    expect(result).toBeDefined();
    expect(result._id).toEqual(1);
  });
});

describe('mergeLastVersionWithBaseObject', () => {
  let getLastVersion;
  beforeEach(() => {
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
  });
  afterEach(() => {
    getLastVersion.restore();
  });

  it('should merge last version of given object with that same object', () => {
    const baseObj = { tpp: '123456', frequency: 'once', versions: [{ createdAt: '2021-09-21T00:00:00' }] };

    getLastVersion.returns(baseObj.versions[0]);

    const result = UtilsHelper.mergeLastVersionWithBaseObject(baseObj, 'createdAt');

    expect(result).toEqual(expect.objectContaining({ ...baseObj.versions[0], ...omit(baseObj, ['versions']) }));
    sinon.assert.calledWithExactly(getLastVersion, baseObj.versions, 'createdAt');
  });

  it('should throw an error if last version cannot be found', () => {
    const baseObj = { tpp: '123456', frequency: 'once', versions: [{ createdAt: '2021-09-21T00:00:00' }] };
    getLastVersion.returns(null);

    expect(() => UtilsHelper.mergeLastVersionWithBaseObject(baseObj, 'createdAt'))
      .toThrowError('Unable to find last version from base object !');
  });
});

describe('getMatchingVersion', () => {
  it('should return null if versions is empty', () => {
    expect(UtilsHelper.getMatchingVersion('2021-09-21T00:00:00', { versions: [] }, 'startDate')).toBeNull();
  });

  it('should return the matching version', () => {
    const obj = {
      versions: [
        { startDate: '2021-09-12T00:00:00', _id: 1 },
        { startDate: '2021-10-21T00:00:00', _id: 2 },
      ],
    };

    const result = UtilsHelper.getMatchingVersion('2021-09-21T00:00:00', obj, 'startDate');
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(1);
  });

  it('should return the last matching version', () => {
    const obj = {
      versions: [
        { startDate: '2021-09-01T00:00:00', _id: 1 },
        { startDate: '2021-09-12T00:00:00', _id: 3 },
        { startDate: '2021-10-21T00:00:00', _id: 2 },
      ],
    };

    const result = UtilsHelper.getMatchingVersion('2021-09-21T00:00:00', obj, 'startDate');
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(3);
  });

  it('should return null if no matching version', () => {
    const obj = {
      versions: [
        { startDate: '2021-09-12T00:00:00', endDate: '2021-09-13T00:00:00', _id: 1 },
        { startDate: '2021-10-21T00:00:00', _id: 2 },
      ],
    };

    expect(UtilsHelper.getMatchingVersion('2021-09-21T00:00:00', obj, 'startDate')).toBeNull();
  });
});

describe('getMatchingObject', () => {
  it('should return null if versions is empty', () => {
    expect(UtilsHelper.getMatchingObject('2021-09-21T00:00:00', [], 'startDate')).toBeNull();
  });

  it('should return the matching object', () => {
    const obj = [
      { startDate: '2021-09-12T00:00:00', _id: 1 },
      { startDate: '2021-10-12T00:00:00', _id: 2 },
    ];

    const result = UtilsHelper.getMatchingObject('2021-09-21T00:00:00', obj, 'startDate');
    expect(result).toBeDefined();
    expect(result._id).toEqual(1);
  });

  it('should return null if no matching version', () => {
    const obj = [
      { startDate: '2021-09-12T00:00:00', endDate: '2021-09-13T00:00:00', _id: 1 },
      { startDate: '2021-10-12T00:00:00', _id: 2 },
    ];

    expect(UtilsHelper.getMatchingObject('2021-09-21T00:00:00', obj, 'startDate')).toBeNull();
  });
});

describe('getFixedNumber', () => {
  it('should return number to string with number of decimals as provided by parameter', () => {
    const result = UtilsHelper.getFixedNumber(10, 2);
    expect(result).toBe('10.00');
  });

  it('should round number', () => {
    const result = UtilsHelper.getFixedNumber(10.175, 2);
    expect(result).toBe('10.18');
  });
});

describe('removeSpaces', () => {
  it('should remove all spaces from string', () => {
    const result = UtilsHelper.removeSpaces('he llo  world  ');
    expect(result).toBe('helloworld');
  });

  it('should return an empty string if parameter is missing', () => {
    const result = UtilsHelper.removeSpaces();
    expect(result).toBe('');
  });
});

describe('formatPrice', () => {
  it('should format price', () => {
    const res = UtilsHelper.formatPrice(5.5);
    expect(res).toEqual('5,50\u00a0€');
  });
});

describe('getFullTitleFromIdentity', () => {
  const identityBase = {
    title: 'mr',
    firstname: 'Bojack',
    lastname: 'Horseman',
  };

  it('should return the title, the firstname and the name', () => {
    const result = UtilsHelper.getFullTitleFromIdentity(identityBase);
    expect(result).toBe('M. Bojack HORSEMAN');
  });

  it('should return the title and the lastname', () => {
    const result = UtilsHelper.getFullTitleFromIdentity(omit(identityBase, 'firstname'));
    expect(result).toBe('M. HORSEMAN');
  });

  it('should return the firstname and the name', () => {
    const result = UtilsHelper.getFullTitleFromIdentity(omit(identityBase, 'title'));
    expect(result).toBe('Bojack HORSEMAN');
  });

  it('should return the firstname', () => {
    const result = UtilsHelper.getFullTitleFromIdentity(pick(identityBase, 'firstname'));
    expect(result).toBe('Bojack');
  });

  it('should return the lastname', () => {
    const result = UtilsHelper.getFullTitleFromIdentity(pick(identityBase, 'lastname'));
    expect(result).toBe('HORSEMAN');
  });

  it('should return an empty string if the identity is not provided', () => {
    expect(UtilsHelper.getFullTitleFromIdentity()).toBe('');
  });
});

describe('formatFloatForExport', () => {
  const validCases = [[0, '0,00'], [1, '1,00'], [7.1, '7,10'], [3.56, '3,56'], [4.23506, '4,24']];
  const invalidValues = [null, undefined, NaN];

  validCases.forEach(([param, result]) => {
    it('should return a formatted float on a valid float', () => {
      expect(UtilsHelper.formatFloatForExport(param)).toBe(result);
    });
  });

  invalidValues.forEach((param) => {
    it('should return an empty string on an invalid value', () => {
      expect(UtilsHelper.formatFloatForExport(param)).toBe('');
    });
  });
});

describe('getDaysRatioBetweenTwoDates', () => {
  it('Case 1. No sundays nor holidays in range', () => {
    const start = new Date('2019/05/21');
    const end = new Date('2019/05/23');
    const result = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toEqual({ holidays: 0, sundays: 0, businessDays: 3 });
  });

  it('Case 2. Sundays in range', () => {
    const start = new Date('2019/05/18');
    const end = new Date('2019/05/23');
    const result = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toEqual({ holidays: 0, sundays: 1, businessDays: 5 });
  });

  it('Case 3. Holidays in range', () => {
    const start = new Date('2022/04/17');
    const end = new Date('2022/04/19');
    const result = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toEqual({ holidays: 1, sundays: 1, businessDays: 1 });
  });
});

describe('areObjectIdsEquals', () => {
  it('should return true if object ids are the same', () => {
    const id1 = new ObjectId();
    const id2 = id1.toHexString();

    const result = UtilsHelper.areObjectIdsEquals(id1, id2);

    expect(result).toBe(true);
  });

  it('should return false if object ids are not the same', () => {
    const id1 = new ObjectId();
    const id2 = new ObjectId().toHexString();

    const result = UtilsHelper.areObjectIdsEquals(id1, id2);

    expect(result).toBe(false);
  });

  it('should return false if one object id is missing', () => {
    const id1 = '';
    const id2 = new ObjectId().toHexString();

    const result = UtilsHelper.areObjectIdsEquals(id1, id2);

    expect(result).toBe(false);
  });

  it('should return false if both object ids are missing', () => {
    const id1 = '';
    const id2 = '';

    const result = UtilsHelper.areObjectIdsEquals(id1, id2);

    expect(result).toBe(false);
  });
});

describe('doesArrayIncludeId', () => {
  let areObjectIdsEqualStub;

  beforeEach(() => { areObjectIdsEqualStub = sinon.stub(UtilsHelper, 'areObjectIdsEquals'); });

  afterEach(() => { areObjectIdsEqualStub.restore(); });

  it('should return true if the array includes the id', () => {
    const correctId = new ObjectId();
    const incorrectId = new ObjectId();
    areObjectIdsEqualStub.onCall(0).returns(false);
    areObjectIdsEqualStub.onCall(1).returns(true);

    const result = UtilsHelper.doesArrayIncludeId([incorrectId, correctId], correctId);

    expect(result).toBe(true);
    sinon.assert.calledWithExactly(areObjectIdsEqualStub.getCall(0), incorrectId, correctId);
    sinon.assert.calledWithExactly(areObjectIdsEqualStub.getCall(1), correctId, correctId);
  });

  it('should return false if the array does not include the id', () => {
    areObjectIdsEqualStub.onCall(0).returns(false);
    areObjectIdsEqualStub.onCall(1).returns(false);

    const result = UtilsHelper.doesArrayIncludeId([new ObjectId(), new ObjectId()], new ObjectId());

    expect(result).toBe(false);
  });
});

describe('isStringedObjectId', () => {
  it('should return true if value objectId to HexString', () => {
    const value = new ObjectId().toHexString();

    const result = UtilsHelper.isStringedObjectId(value);

    expect(result).toBe(true);
  });

  it('should return true if value is a 14-digit hexadecimal number put into a string', () => {
    const value = '12A22F32AB1094ABCDE12345';

    const result = UtilsHelper.isStringedObjectId(value);

    expect(result).toBe(true);
  });

  it('should return false if value is random string', () => {
    const value = 'toto';

    const result = UtilsHelper.isStringedObjectId(value);

    expect(result).toBe(false);
  });
});

describe('getExclTaxes', () => {
  it('should return excluded taxes price', () => {
    const result = UtilsHelper.getExclTaxes(20, 25);

    expect(result).toEqual('16');
  });
});

describe('sumReduce', () => {
  it('should sum element in array', () => {
    const result = UtilsHelper.sumReduce([{ incl: 20 }, { incl: 12, excl: 23 }], 'incl');

    expect(result).toEqual('32');
  });
});

describe('computeExclTaxesWithDiscount', () => {
  it('should return excluded taxes price with discount', () => {
    const result = UtilsHelper.computeExclTaxesWithDiscount(18, 1.2, 20);
    expect(result).toEqual('17');
  });
});

describe('getTotalDuration', () => {
  it('should return duration with minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00.000Z', endDate: '2020-03-20T11:00:00.000Z' },
      { startDate: '2020-04-21T09:00:00.000Z', endDate: '2020-04-21T11:30:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDuration(slots);

    expect(result).toEqual('4h30');
  });

  it('should return duration with leading zero minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00.000Z', endDate: '2020-03-20T11:08:00.000Z' },
      { startDate: '2020-04-21T09:00:00.000Z', endDate: '2020-04-21T11:00:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDuration(slots);

    expect(result).toEqual('4h08');
  });

  it('should return duration without minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00.000Z', endDate: '2020-03-20T11:00:00.000Z' },
      { startDate: '2020-04-21T09:00:00.000Z', endDate: '2020-04-21T11:00:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDuration(slots);

    expect(result).toEqual('4h');
  });

  it('should return duration with days', () => {
    const slots = [
      { startDate: '2020-03-20T07:00:00.000Z', endDate: '2020-03-20T22:00:00.000Z' },
      { startDate: '2020-04-21T07:00:00.000Z', endDate: '2020-04-21T22:00:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDuration(slots);

    expect(result).toEqual('30h');
  });
});

describe('getTotalDurationForExport', () => {
  it('should return duration with minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00.000Z', endDate: '2020-03-20T11:00:00.000Z' },
      { startDate: '2020-04-21T09:00:00.000Z', endDate: '2020-04-21T11:30:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDurationForExport(slots);

    expect(result).toEqual('4,50');
  });

  it('should return duration without minutes', () => {
    const slots = [
      { startDate: '2020-03-20T09:00:00.000Z', endDate: '2020-03-20T11:00:00.000Z' },
      { startDate: '2020-04-21T09:00:00.000Z', endDate: '2020-04-21T11:00:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDurationForExport(slots);

    expect(result).toEqual('4,00');
  });

  it('should return duration with days', () => {
    const slots = [
      { startDate: '2020-03-20T07:00:00.000Z', endDate: '2020-03-20T22:00:00.000Z' },
      { startDate: '2020-04-21T07:00:00.000Z', endDate: '2020-04-21T22:00:00.000Z' },
    ];

    const result = UtilsHelper.getTotalDurationForExport(slots);

    expect(result).toEqual('30,00');
  });
});

describe('getDuration', () => {
  it('should return duration with minutes', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-20T11:30:00.000Z';

    const result = UtilsHelper.getDuration(startDate, endDate);

    expect(result).toEqual('2h30');
  });

  it('should return duration with leading zero minutes', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-20T11:08:00.000Z';

    const result = UtilsHelper.getDuration(startDate, endDate);

    expect(result).toEqual('2h08');
  });

  it('should return duration without minutes', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-20T11:00:00.000Z';

    const result = UtilsHelper.getDuration(startDate, endDate);

    expect(result).toEqual('2h');
  });

  it('should return duration with days', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-21T15:00:00.000Z';

    const result = UtilsHelper.getDuration(startDate, endDate);

    expect(result).toEqual('30h');
  });
});

describe('getDurationForExport', () => {
  it('should return duration with minutes', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-20T11:30:00.000Z';

    const result = UtilsHelper.getDurationForExport(startDate, endDate);

    expect(result).toEqual('2,50');
  });

  it('should return duration without minutes', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-20T11:00:00.000Z';

    const result = UtilsHelper.getDurationForExport(startDate, endDate);

    expect(result).toEqual('2,00');
  });

  it('should return duration with days', () => {
    const startDate = '2020-03-20T09:00:00.000Z';
    const endDate = '2020-03-21T15:00:00.000Z';

    const result = UtilsHelper.getDurationForExport(startDate, endDate);

    expect(result).toEqual('30,00');
  });
});

describe('computeDuration', () => {
  it('should return total duration', () => {
    const durations = [{ minutes: 13 }, { minutes: 12 }];

    const result = UtilsHelper.computeDuration(durations);

    expect(result.toObject()).toEqual({ minutes: 25 });
  });
});

describe('getKeysOf2DepthObject', () => {
  it('should return keys of 1 depth object', () => {
    const nestedObject = {
      starter: 3,
      dish: 2,
      dessert: 6,
    };

    const result = UtilsHelper.getKeysOf2DepthObject(nestedObject);

    expect(result).toEqual(['starter', 'dish', 'dessert']);
  });

  it('should return keys of 2 depth object', () => {
    const nestedObject = {
      starter: 3,
      dish: {
        fishStew: 9,
      },
      dessert: {
        cake: 1,
        pie: 5,
      },
    };

    const result = UtilsHelper.getKeysOf2DepthObject(nestedObject);

    expect(result).toEqual(['starter', 'dish.fishStew', 'dessert.cake', 'dessert.pie']);
  });
});
