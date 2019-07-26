const expect = require('expect');
const app = require('../../server');
const { populateDB, cleanDB, eventHistoryList, eventHistoryAuxiliary } = require('./seed/eventHistoriesSeed');
const { populateUsers, getToken } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENT HISTORY ROUTES', () => {
  let authToken = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken();
  });
  afterEach(cleanDB);

  describe('GET /eventhistories', () => {
    it('should return all event histories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/eventhistories',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      expect(response.result.data.eventHistories.length).toEqual(eventHistoryList.length);
    });

    it('should return a list of event histories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?auxiliaries=${eventHistoryAuxiliary._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(history.auxiliaries.some(aux => aux._id.toHexString() === eventHistoryAuxiliary._id.toHexString())).toBeTruthy();
      });
    });

    it('should return a 400 if invalid query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?auxiliary=${eventHistoryAuxiliary._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(400);
    });
  });
});
