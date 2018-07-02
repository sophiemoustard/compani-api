const expect = require('expect');
const { ObjectID } = require('mongodb');

const app = require('../server');
const { getToken, populateUsers } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populatePlanningUpdates } = require('./seed/planningUpdatesSeed');

describe('PLANNING UPDATES ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(populatePlanningUpdates);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('GET /planningUpdates', () => {
    it('should return planning updates list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/planningUpdates',
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.modifPlanning.length).toBe(1);
    });
  });
});
