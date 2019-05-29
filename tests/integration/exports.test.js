const expect = require('expect');
const { populateEvents } = require('./seed/eventsSeed');
const { populateUsers } = require('./seed/usersSeed');
const { populateCustomers } = require('./seed/customersSeed');
const { populateSectors } = require('./seed/sectorsSeed');
const { getToken } = require('./seed/usersSeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EXPORTS ROUTES', () => {
  let authToken = null;
  before(populateEvents);
  before(populateUsers);
  before(populateCustomers);
  before(populateSectors);

  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /exports/working_events/history', () => {
    it('should get working events', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/exports/working_events/history?startDate=2019-01-15T15%3A47%3A42.077%2B01%3A00&endDate=2019-01-17T15%3A47%3A42.077%2B01%3A00',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
      expect(response.result.split('\r\n').length).toBe(5);
    });
  });
});
