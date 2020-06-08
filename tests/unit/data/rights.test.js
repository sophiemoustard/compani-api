const { rights } = require('../../../src/data/rights');
const expect = require('expect');

describe('checking the format of right.js file', () => {
  it('there must be only one right per permission', async () => {
    const permissions = rights.map(right => right.permission);
    const noDuplicatedRights = new Set(permissions).size === permissions.length;

    expect(noDuplicatedRights).toBeTruthy();
  });
});
