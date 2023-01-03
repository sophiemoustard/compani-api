const { expect } = require('expect');
const app = require('../../server');
const {
  populateDB,
  eventHistoryList,
  auxiliaries,
  auxiliaryFromOtherCompany,
  sectorFromOtherCompany,
  sectors,
  events,
} = require('./seed/eventHistoriesSeed');
const { getToken } = require('./helpers/authentication');
const UtilsHelper = require('../../src/helpers/utils');
const EventHistory = require('../../src/models/EventHistory');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENT HISTORIES ROUTES - GET /eventhistories', () => {
  let authToken;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('coach');
  });

  it('should return all event histories from user\'s company', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/eventhistories',
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);

    const eventHistoriesFromAuthCompany = eventHistoryList
      .filter(eh => UtilsHelper.areObjectIdsEquals(eh.company, authCompany._id));
    expect(response.result.data.eventHistories.length).toEqual(eventHistoriesFromAuthCompany.length);
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
    const eventId = events[0]._id;

    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?eventId=${eventId}`,
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
    expect(response.result.data.eventHistories.every(history =>
      UtilsHelper.areObjectIdsEquals(history.event.eventId, eventId))).toBeTruthy();
  });

  it('should return a list of all event histories from multiple action type', async () => {
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

  it('should return a list of all event histories with one action type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/eventhistories?action=event_update',
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(200);
  });

  it('should return a 400 if invalid action in query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/eventhistories?action=event_update&action=mauvaiseaction',
      headers: { Cookie: `alenvi_token=${authToken}` },
    });

    expect(response.statusCode).toEqual(400);
  });

  it('should return 400 if isCancelled is invalid', async () => {
    const eventId = events[0]._id;

    const response = await app.inject({
      method: 'GET',
      url: `/eventhistories?eventId=${eventId}&isCancelled=true`,
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

describe('EVENT HISTORIES ROUTES - PUT /eventhistories/{_id}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should update an event history', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[3]._id}`,
        payload: { isCancelled: true, timeStampCancellationReason: 'oups' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);

      const eventHistoryUpdated = await EventHistory.countDocuments({
        _id: eventHistoryList[3]._id,
        isCancelled: true,
      });
      expect(eventHistoryUpdated).toEqual(1);
    });

    it('should return 400 if isCancelled is false', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[3]._id}`,
        payload: { isCancelled: false },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return 400 if timeCancellationReason is misisng', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[3]._id}`,
        payload: { isCancelled: true },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return 404 if event history is not a time stamping history', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[0]._id}`,
        payload: { isCancelled: true, timeStampCancellationReason: 'oups' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return 404 if event history is cancelled', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[4]._id}`,
        payload: { isCancelled: true, timeStampCancellationReason: 'oups' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return 404 if event history from other company', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[5]._id}`,
        payload: { isCancelled: true, timeStampCancellationReason: 'oups' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return 403 if event history is from billed event', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/eventhistories/${eventHistoryList[6]._id}`,
        payload: { isCancelled: true, timeStampCancellationReason: 'oups' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
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
          method: 'PUT',
          url: `/eventhistories/${eventHistoryList[3]._id}`,
          payload: { isCancelled: true, timeStampCancellationReason: 'oups' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
