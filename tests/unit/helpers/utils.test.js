const expect = require('expect');
const moment = require('moment');

const {
  getLastVersion,
  getMatchingVersion,
  clean,
} = require('../../../helpers/utils');

describe('getLastVersion', () => {
  it('should return the last version based on the date key', () => {
    const versions = [
      { startDate: moment().toISOString(), createdAt: moment().toISOString(), _id: 1 },
      { startDate: moment().add(1, 'd').toISOString(), createdAt: moment().subtract(1, 'd').toISOString(), _id: 2 },
    ];

    expect(getLastVersion(versions, 'startDate')).toBeDefined();
    expect(getLastVersion(versions, 'startDate')._id).toEqual(2);
    expect(getLastVersion(versions, 'createdAt')).toBeDefined();
    expect(getLastVersion(versions, 'createdAt')._id).toEqual(1);
  });

  it('should throw an error if version is not an array', () => {
     expect(function () { getLastVersion({ toto: 'lala' }, 'createdAt') }).toThrow(new Error('versions must be an array !'));
  });

  it('should throw an error if the key is not a string', () => {
     expect(function () { getLastVersion([{ toto: 'lala' }], 3) }).toThrow(new Error('sortKey must be a string !'));
  });

  it('should return null if versions is empty', () => {
    expect(getLastVersion([], 'toto')).toBeNull();
  });

  it('should return the single element is versions only contains one element', () => {
    const versions = [
      { startDate: moment().toISOString(), createdAt: moment().toISOString(), _id: 1 },
    ];

    const result = getLastVersion(versions, 'startDate');
    expect(result).toBeDefined();
    expect(result._id).toEqual(1);
  });
});

describe('getMatchingVersion', () => {
  it('should throw an error if version is not an array', () => {
     expect(function () { getMatchingVersion({ versions: 'lala' }, moment().toISOString()) }).toThrow(new Error('versions must be an array !'));
  });

  it('should return null if versions is empty', () => {
    expect(getMatchingVersion(moment().toISOString(), { versions: [] })).toBeNull();
  });

  it('should return the matching version', () => {
    const obj = {
      versions: [
        { startDate: moment().toISOString(), _id: 1 },
        { startDate: moment().add(2, 'd').toISOString(), _id: 2 },
      ],
    };

    const result = getMatchingVersion(moment().add(1, 'd').toISOString(), obj);
    expect(result).toBeDefined();
    expect(result.versionId).toEqual(1);
  });

  it('should return null if no matching version', () => {
    const obj = {
      versions: [
        { startDate: moment().toISOString(), endDate: moment().add(5, 'h').toISOString(), _id: 1 },
        { startDate: moment().add(2, 'd').toISOString(), _id: 2 },
      ],
    };

    expect(getMatchingVersion(moment().add(1, 'd').toISOString(), obj)).toBeNull();
  });
});

describe('clean', () => {
  it('should delete undefined value', () => {
    const result = clean({ _id: 1, value: undefined });
    expect(result.value).not.toBeDefined()
  });

  it('should delete empty array', () => {
    const result = clean({ _id: 1, value: [] });
    expect(result.value).not.toBeDefined()
  });

  it('should delete empty object', () => {
    const result = clean({ _id: 1, value: {} });
    expect(result.value).not.toBeDefined()
  });

  it('should delete empty string', () => {
    const result = clean({ _id: 1, value: '' });
    expect(result.value).not.toBeDefined()
  });
})
