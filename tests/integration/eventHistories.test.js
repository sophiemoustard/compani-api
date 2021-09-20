const expect = require('expect');
const app = require('../../server');
const {
  populateDB,
  eventHistoryList,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sectors,
} = require('./seed/eventHistoriesSeed');
const { getToken } = require('./helpers/authentication');
const UtilsHelper = require('../../src/helpers/utils');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('GET /eventhistories', () => {
  let authToken;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  it('should return all event histories', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/eventhistories',
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
    expect(response.result.data.eventHistories.length).toEqual(eventHistoryList.length);
  });

  it('should return a list of event histories from auxiliaries ids', async () => {
    const auxiliaryIds = [auxiliaries[0]._id, auxiliaries[1]._id];
    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?auxiliaries=${auxiliaryIds[0]}&auxiliaries=${auxiliaryIds[1]}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
    response.result.data.eventHistories.forEach((history) => {
      expect(history.auxiliaries.every(aux => UtilsHelper.doesArrayIncludeId(auxiliaryIds, aux._id))).toBeTruthy();
    });
  });

  it('should return a list of event histories from sectors ids', async () => {
    const sectorIds = sectors.map(s => s._id);
    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?sectors=${sectorIds[0]}&sectors=${sectorIds[1]}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
    response.result.data.eventHistories.forEach((history) => {
      expect(history.sectors.every(sectorId => UtilsHelper.doesArrayIncludeId(sectorIds, sectorId))).toBeTruthy();
    });
  });

  it('should return a list of event histories for one event', async () => {
    const eventId = eventHistoryList[0]._id;

    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?eventId=${eventId}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
    expect(response.result.data.eventHistories.every(history =>
      UtilsHelper.areObjectIdsEquals(history.event.eventId, eventId))).toBeTruthy();
  });

  it('should return a list of all event histories with action type', async () => {
    const actions = ['event_creation', 'event_update'];
    const response = await app.inject({
      method: 'GET',
      url: '/eventhistories?action=event_update&action=event_creation',
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
    expect(response.result.data.eventHistories.length).toBe(2);
    expect(response.result.data.eventHistories.every(history => actions.includes(history.action))).toBeTruthy();
  });

  it('should return a 400 if invalid query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?auxiliary=${auxiliaries[0]._id}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(400);
  });

  it('should return a 404 if at least one auxiliary is not from the same company', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?auxiliaries=${auxiliaryFromOtherCompany._id}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(404);
  });

  it('should return a 404 if at least one sector is not from the same company', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?sectors=${sectorFromOtherCompany._id}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(404);
  });

  it('should return a 400 if invalid action in query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/eventhistories?action=event_update&action=mauvaiseaction',
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(400);
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: '/eventhistories',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
