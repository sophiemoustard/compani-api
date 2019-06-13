const expect = require('expect');
const { populateEvents } = require('./seed/eventsSeed');
const { populateUsers } = require('./seed/usersSeed');
const { populateCustomers } = require('./seed/customersSeed');
const { populateSectors } = require('./seed/sectorsSeed');
const { populateBills } = require('./seed/billsSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populateCompanies } = require('./seed/companiesSeed');
const { populateThirdPartyPayers } = require('./seed/thirdPartyPayersSeed');
const { populatePayments } = require('./seed/paymentsSeed');
const { getToken } = require('./seed/usersSeed');
const { populateDB } = require('./seed/paySeed');
const app = require('../../server');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EXPORTS ROUTES', () => {
  let authToken = null;
  before(populateRoles);
  before(populateCompanies);
  before(populateEvents);
  before(populateUsers);
  before(populateCustomers);
  before(populateSectors);
  before(populateBills);
  before(populateThirdPartyPayers);
  before(populatePayments);

  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /exports/working_event/history', () => {
    it('should get working events', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/exports/working_event/history?startDate=2019-01-15T15%3A47%3A42.077%2B01%3A00&endDate=2019-01-17T15%3A47%3A42.077%2B01%3A00',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
      expect(response.result.split('\r\n').length).toBe(5);
    });
  });

  describe('GET /exports/bill/history', () => {
    it('should get bills', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/exports/bill/history?startDate=2019-05-26T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-29T15%3A47%3A42.077%2B01%3A00',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
      expect(response.result.split('\r\n').length).toBe(3);
    });
  });

  describe('GET /exports/payment/history', () => {
    it('should get payments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/exports/payment/history?startDate=2019-05-26T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-29T15%3A47%3A42.077%2B01%3A00',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
      expect(response.result.split('\r\n').length).toBe(3);
    });
  });

  describe('GET /exports/pay/history', () => {
    before(populateDB);
    it('should get pay', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/exports/pay/history?startDate=2019-05-01T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-31T15%3A47%3A42.077%2B01%3A00',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
      expect(response.result.split('\r\n').length).toBe(2);
    });
  });

  describe('GET /exports/finalPay/history', () => {
    before(populateDB);
    it('should get payments', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/exports/finalpay/history?startDate=2019-05-01T15%3A47%3A42.077%2B01%3A00&endDate=2019-05-31T15%3A47%3A42.077%2B01%3A00',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result).toBeDefined();
      expect(response.result.split('\r\n').length).toBe(2);
    });
  });
});
