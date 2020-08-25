const expect = require('expect');
const moment = require('moment');
const sinon = require('sinon');
const omit = require('lodash/omit');
const pick = require('lodash/pick');

const UtilsHelper = require('../../../src/helpers/utils');

describe('getLastVersion', () => {
  it('should return the last version based on the date key', () => {
    const versions = [
      { startDate: moment().toISOString(), createdAt: moment().toISOString(), _id: 1 },
      {
        startDate: moment()
          .add(1, 'd')
          .toISOString(),
        createdAt: moment()
          .subtract(1, 'd')
          .toISOString(),
        _id: 2,
      },
    ];

    expect(UtilsHelper.getLastVersion(versions, 'startDate')).toBeDefined();
    expect(UtilsHelper.getLastVersion(versions, 'startDate')._id).toEqual(2);
    expect(UtilsHelper.getLastVersion(versions, 'createdAt')).toBeDefined();
    expect(UtilsHelper.getLastVersion(versions, 'createdAt')._id).toEqual(1);
  });

  it('should throw an error if version is not an array', () => {
    expect(() => UtilsHelper.getLastVersion({ toto: 'lala' }, 'createdAt'))
      .toThrow(new Error('versions must be an array !'));
  });

  it('should throw an error if the key is not a string', () => {
    expect(() => UtilsHelper.getLastVersion([{ toto: 'lala' }], 3)).toThrow(new Error('sortKey must be a string !'));
  });

  it('should return null if versions is empty', () => {
    expect(UtilsHelper.getLastVersion([], 'toto')).toBeNull();
  });

  it('should return the single element is versions only contains one element', () => {
    const versions = [{ startDate: moment().toISOString(), createdAt: moment().toISOString(), _id: 1 }];

    const result = UtilsHelper.getLastVersion(versions, 'startDate');
    expect(result).toBeDefined();
    expect(result._id).toEqual(1);
  });
});

describe('mergeLastVersionWithBaseObject', () => {
  it('should merge last version of given object with that same object', () => {
    const baseObj = { tpp: '123456', frequency: 'once', versions: [{ createdAt: moment().toISOString() }] };
    const getLastVersionStub = sinon.stub(UtilsHelper, 'getLastVersion');

    getLastVersionStub.returns(baseObj.versions[0]);
    const result = UtilsHelper.mergeLastVersionWithBaseObject(baseObj, 'createdAt');
    expect(result).toEqual(expect.objectContaining({ ...baseObj.versions[0], ...omit(baseObj, ['versions']) }));
    sinon.assert.called(getLastVersionStub);
    getLastVersionStub.restore();
  });

  it('should throw an error if last version cannot be found', () => {
    const baseObj = { tpp: '123456', frequency: 'once', versions: [{ createdAt: moment().toISOString() }] };
    const getLastVersionStub = sinon.stub(UtilsHelper, 'getLastVersion').returns(null);
    expect(() => UtilsHelper.mergeLastVersionWithBaseObject(baseObj, 'createdAt'))
      .toThrowError('Unable to find last version from base object !');
    getLastVersionStub.restore();
  });
});

describe('getMatchingVersion', () => {
  it('should throw an error if version is not an array', () => {
    expect(() => UtilsHelper.getMatchingVersion(moment().toISOString(), { versions: 'lala' }, 'startDate'))
      .toThrow(new Error('versions must be an array !'));
  });

  it('should return null if versions is empty', () => {
    expect(UtilsHelper.getMatchingVersion(moment().toISOString(), { versions: [] }, 'startDate')).toBeNull();
  });

  it('should return the matching version', () => {
    const obj = {
      versions: [
        { startDate: moment().toISOString(), _id: 1 },
        {
          startDate: moment()
            .add(2, 'd')
            .toISOString(),
          _id: 2,
        },
      ],
    };

    const result = UtilsHelper.getMatchingVersion(moment().add(1, 'd').toISOString(), obj, 'startDate');
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(1);
  });

  it('should return the last matching version', () => {
    const obj = {
      versions: [
        { startDate: moment().subtract(1, 'd').toISOString(), _id: 1 },
        { startDate: moment().toISOString(), _id: 3 },
        { startDate: moment().add(2, 'd').toISOString(), _id: 2 },
      ],
    };

    const result = UtilsHelper.getMatchingVersion(moment().add(1, 'd').toISOString(), obj, 'startDate');
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(3);
  });

  it('should return null if no matching version', () => {
    const obj = {
      versions: [
        {
          startDate: moment().toISOString(),
          endDate: moment()
            .add(5, 'h')
            .toISOString(),
          _id: 1,
        },
        {
          startDate: moment()
            .add(3, 'd')
            .toISOString(),
          _id: 2,
        },
      ],
    };

    expect(UtilsHelper.getMatchingVersion(moment().add(2, 'd').toISOString(), obj, 'startDate')).toBeNull();
  });
});

describe('getFixedNumber', () => {
  it('should return number to string with number of decimals as provided by parameter', () => {
    const result = UtilsHelper.getFixedNumber(10, 2);
    expect(result).toBe('10.00');
  });
  it('should return an error if number parameter is not a number', () => {
    expect(() => {
      UtilsHelper.getFixedNumber('test', 3);
    }).toThrow(new Error('You must provide a number !'));
  });
});

describe('removeSpaces', () => {
  it('should remove all spaces from string', () => {
    const result = UtilsHelper.removeSpaces('he llo  world  ');
    expect(result).toBe('helloworld');
  });
  it('should return an error if parameter is not a string', () => {
    expect(() => {
      UtilsHelper.removeSpaces(3);
    }).toThrow(new Error('Parameter must be a string !'));
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
    const start = new Date('2019/05/07');
    const end = new Date('2019/05/09');
    const result = UtilsHelper.getDaysRatioBetweenTwoDates(start, end);

    expect(result).toBeDefined();
    expect(result).toEqual({ holidays: 1, sundays: 0, businessDays: 2 });
  });
});

describe('formatDuration', () => {
  it('should format duration with minutes', () => {
    const duration = moment.duration({ minutes: 20, hours: 2 });
    const result = UtilsHelper.formatDuration(duration);

    expect(result).toEqual('2h20');
  });
  it('should format duration with padded minutes', () => {
    const duration = moment.duration({ minutes: 2, hours: 2 });
    const result = UtilsHelper.formatDuration(duration);

    expect(result).toEqual('2h02');
  });
  it('should format duration with days', () => {
    const duration = moment.duration({ days: 2, hours: 2 });
    const result = UtilsHelper.formatDuration(duration);

    expect(result).toEqual('50h');
  });
});
