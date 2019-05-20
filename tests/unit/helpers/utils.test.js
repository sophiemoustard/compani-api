const expect = require('expect');
const moment = require('moment');

const {
  getLastVersion,
  getMatchingVersion,
  clean,
  getFixedNumber,
  removeSpaces,
  formatPrice
} = require('../../../helpers/utils');

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
        _id: 2
      }
    ];

    expect(getLastVersion(versions, 'startDate')).toBeDefined();
    expect(getLastVersion(versions, 'startDate')._id).toEqual(2);
    expect(getLastVersion(versions, 'createdAt')).toBeDefined();
    expect(getLastVersion(versions, 'createdAt')._id).toEqual(1);
  });

  it('should throw an error if version is not an array', () => {
    expect(() => getLastVersion({ toto: 'lala' }, 'createdAt')).toThrow(new Error('versions must be an array !'));
  });

  it('should throw an error if the key is not a string', () => {
    expect(() => getLastVersion([{ toto: 'lala' }], 3)).toThrow(new Error('sortKey must be a string !'));
  });

  it('should return null if versions is empty', () => {
    expect(getLastVersion([], 'toto')).toBeNull();
  });

  it('should return the single element is versions only contains one element', () => {
    const versions = [{ startDate: moment().toISOString(), createdAt: moment().toISOString(), _id: 1 }];

    const result = getLastVersion(versions, 'startDate');
    expect(result).toBeDefined();
    expect(result._id).toEqual(1);
  });
});

describe('getMatchingVersion', () => {
  it('should throw an error if version is not an array', () => {
    expect(() => getMatchingVersion(moment().toISOString(), { versions: 'lala' }, 'startDate')).toThrow(new Error('versions must be an array !'));
  });

  it('should return null if versions is empty', () => {
    expect(getMatchingVersion(moment().toISOString(), { versions: [] }, 'startDate')).toBeNull();
  });

  it('should return the matching version', () => {
    const obj = {
      versions: [
        { startDate: moment().toISOString(), _id: 1 },
        {
          startDate: moment()
            .add(2, 'd')
            .toISOString(),
          _id: 2
        }
      ]
    };

    const result = getMatchingVersion(moment().add(1, 'd').toISOString(), obj, 'startDate');
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

    const result = getMatchingVersion(moment().add(1, 'd').toISOString(), obj, 'startDate');
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
          _id: 1
        },
        {
          startDate: moment()
            .add(2, 'd')
            .toISOString(),
          _id: 2
        }
      ]
    };

    expect(getMatchingVersion(moment().add(1, 'd').toISOString(), obj, 'startDate')).toBeNull();
  });
});

describe('clean', () => {
  it('should delete undefined value', () => {
    const result = clean({ _id: 1, value: undefined });
    expect(result.value).not.toBeDefined();
  });

  it('should delete empty array', () => {
    const result = clean({ _id: 1, value: [] });
    expect(result.value).not.toBeDefined();
  });

  it('should delete empty object', () => {
    const result = clean({ _id: 1, value: {} });
    expect(result.value).not.toBeDefined();
  });

  it('should delete empty string', () => {
    const result = clean({ _id: 1, value: '' });
    expect(result.value).not.toBeDefined();
  });
});

describe('getFixedNumber', () => {
  it('should return number to string with number of decimals as provided by parameter', () => {
    const result = getFixedNumber(10, 2);
    expect(result).toBe('10.00');
  });
  it('should return an error if number parameter is not a number', () => {
    expect(() => {
      getFixedNumber('test', 3);
    }).toThrow(new Error('You must provide a number !'));
  });
});

describe('removeSpaces', () => {
  it('should remove all spaces from string', () => {
    const result = removeSpaces('he llo  world  ');
    expect(result).toBe('helloworld');
  });
  it('should return an error if parameter is not a string', () => {
    expect(() => {
      removeSpaces(3);
    }).toThrow(new Error('Parameter must be a string !'));
  });
  it('should return an empty string if parameter is missing', () => {
    const result = removeSpaces();
    expect(result).toBe('');
  });
});

describe('formatPrice', () => {
  it('should format price', () => {
    const res = formatPrice(5.5);
    expect(res).toEqual('5,50\u00a0€');
  });
});
