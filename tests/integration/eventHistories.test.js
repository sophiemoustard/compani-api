const expect = require('expect');
const app = require('../../server');
const {
  populateDB,
  eventHistoryList,
  eventHistoryAuxiliaries,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sectors,
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
        url: `/eventhistories?auxiliaries=${eventHistoryAuxiliaries[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(
          history.auxiliaries.some(aux => aux._id.toHexString() === eventHistoryAuxiliaries[0]._id.toHexString())
        ).toBeTruthy();
      });
    });

    it('should return a list of event histories from a sector id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?sectors=${sectors[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(history.sectors.some(sectorId => sectorId.toHexString() === sectors[0]._id.toHexString())).toBeTruthy();
      });
    });

    it('should return a list of event histories from auxiliaries ids', async () => {
      const auxiliaryIds = [eventHistoryAuxiliaries[0]._id.toHexString(), eventHistoryAuxiliaries[1]._id.toHexString()];
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?auxiliaries=${auxiliaryIds[0]}&auxiliaries=${auxiliaryIds[1]}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(
          history.auxiliaries.every(aux => aux._id.toHexString() === eventHistoryAuxiliaries[0]._id.toHexString() ||
            aux._id.toHexString() === eventHistoryAuxiliaries[1]._id.toHexString()
          )
        ).toBeTruthy();
      });
    });

    it('should return a list of event histories from sectors ids', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?sectors=${sectors[0]._id.toHexString()}&sectors=${sectors[1]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.eventHistories).toBeDefined();
      response.result.data.eventHistories.forEach((history) => {
        expect(history.sectors.every(sectorId => sectorId.toHexString() === sectors[0]._id.toHexString() ||
          sectorId.toHexString() === sectors[1]._id.toHexString())).toBeTruthy();
      });
    });

    it('should return a 400 if invalid query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/eventhistories?auxiliary=${eventHistoryAuxiliaries[0]._id.toHexString()}`,
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
