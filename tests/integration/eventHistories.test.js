const expect = require('expect');
const app = require('../../server');
const {
  populateDB,
  eventHistoryList,
  eventHistoryAuxiliary,
  eventHistoryAuxiliary2,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sector,
  sector2,
} = require('./seed/eventHistoriesSeed');
const { getToken } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENT HISTORY ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

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

    it('should return a list of event histories from an auxiliaryId', async () => {
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

    it('should return a list of event histories from a sector id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?sectors=${sector._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(history.sectors.some(sectorId => sectorId.toHexString() === sector._id.toHexString())).toBeTruthy();
      });
    });

    it('should return a list of event histories from auxiliaries ids', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?auxiliaries=${eventHistoryAuxiliary._id.toHexString()}&auxiliaries=${eventHistoryAuxiliary2._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(history.auxiliaries.some(aux => aux._id.toHexString() === eventHistoryAuxiliary._id.toHexString())).toBeTruthy();
      });
    });

    it('should return a list of event histories from sectors ids', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?sectors=${sector._id.toHexString()}&sectors=${sector2._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(history.sectors.some(sectorId => sectorId.toHexString() === sector._id.toHexString())).toBeTruthy();
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

    it('should return a 403 if at least one auxiliary is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?auxiliaries=${auxiliaryFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if at least one sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?sectors=${sectorFromOtherCompany._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(403);
    });
  });
});
