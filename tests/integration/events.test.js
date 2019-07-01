const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const { getToken } = require('./seed/usersSeed');
const { populateEvents, eventsList } = require('./seed/eventsSeed');
const { populateUsers, userList } = require('./seed/usersSeed');
const { populateCustomers, customersList } = require('./seed/customersSeed');
const { populateContracts } = require('./seed/contractsSeed');
const { populateServices } = require('./seed/servicesSeed');
const { sectorsList } = require('./seed/sectorsSeed');
const { populateCompanies } = require('./seed/companiesSeed');
const app = require('../../server');
const { INTERVENTION, ABSENCE, UNAVAILABILITY, INTERNAL_HOUR, ILLNESS, DAILY } = require('../../helpers/constants');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENTS ROUTES', () => {
  let authToken = null;
  before(populateContracts);
  before(populateServices);
  before(populateCompanies);
  before(populateUsers);
  before(populateCustomers);
  beforeEach(populateEvents);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('GET /events', () => {
    it('should return all events', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events).toBeDefined();
      expect(response.result.data.events.length).toEqual(eventsList.length);
    });

    it('should return a list of events', async () => {
      const startDate = moment('2019-01-18');
      const endDate = moment('2019-01-20');
      const response = await app.inject({
        method: 'GET',
        url: `/events?startDate=${startDate.toDate()}&endDate=${endDate.toDate()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events).toBeDefined();
      response.result.data.events.forEach((event) => {
        expect(moment(event.startDate).isSameOrAfter(startDate)).toBeTruthy();
        expect(moment(event.startDate).isSameOrBefore(endDate)).toBeTruthy();
        if (event.type === 'intervention') {
          expect(event.subscription._id).toBeDefined();
        }
      });
    });

    it('should return an empty list as no event is matching the request', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?startDate=20000101&endDate=20001010',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events).toEqual([]);
    });
  });

  describe('POST /events', () => {
    it('should create an internal hour', async () => {
      const auxiliary = userList[4];
      const payload = {
        type: INTERNAL_HOUR,
        startDate: '2019-01-23T10:00:00.000+01:00',
        endDate: '2019-01-23T12:30:00.000+01:00',
        auxiliary: auxiliary._id,
        sector: sectorsList[0]._id,
        location: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony'
        },
        internalHour: {
          name: 'Formation',
          _id: new ObjectID('5cf7defc3d14e9701967acf7'),
          default: false,
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create an intervention', async () => {
      const auxiliary = userList[4];
      const customer = customersList[0];
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00.000+01:00',
        endDate: '2019-01-23T12:30:00.000+01:00',
        auxiliary: auxiliary._id,
        sector: sectorsList[0]._id,
        customer: customer._id,
        subscription: customer.subscriptions[0]._id,
        status: 'contract_with_company',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create an absence', async () => {
      const auxiliary = userList[4];
      const payload = {
        type: ABSENCE,
        startDate: '2019-01-23T10:00:00.000+01:00',
        endDate: '2019-01-23T12:30:00.000+01:00',
        auxiliary: auxiliary._id,
        sector: sectorsList[0]._id,
        absence: ILLNESS,
        absenceNature: DAILY,
        attachment: {
          driveId: 'qwertyuiop',
          link: 'asdfghjkl;',
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });


    it('should create an unavailability', async () => {
      const auxiliary = userList[4];
      const payload = {
        type: UNAVAILABILITY,
        startDate: '2019-01-23T10:00:00.000+01:00',
        endDate: '2019-01-23T12:30:00.000+01:00',
        auxiliary: auxiliary._id,
        sector: sectorsList[0]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should return a 400 error as payload is invalid (subscription missing with type intervention)', async () => {
      const payload = {
        type: 'intervention',
        startDate: '2019-01-23T10:00:00.000+01:00',
        endDate: '2019-01-23T12:30:00.000+01:00',
        auxiliary: '5c0002a5086ec30013f7f436',
        customer: '5c35b5eb1a6fb00997363eeb',
        location: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony'
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toEqual(400);
    });
  });

  describe('PUT /events/{_id}', () => {
    it('should update corresponding event', async () => {
      const payload = { startDate: '2019-01-23T10:00:00.000Z', endDate: '2019-01-23T12:00:00.000Z' };
      const event = eventsList[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.event).toBeDefined();
      expect(response.result.data.event._id).toEqual(event._id);
      expect(moment(response.result.data.event.startDate).isSame(moment(payload.startDate))).toBeTruthy();
      expect(moment(response.result.data.event.endDate).isSame(moment(payload.endDate))).toBeTruthy();
    });

    it('should return a 400 error as payload is invalid', async () => {
      const payload = { beginDate: '2019-01-23T10:00:00.000Z' };
      const event = eventsList[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error as startDate and endDate are not on the same day', async () => {
      const payload = { startDate: '2019-01-23T10:00:00.000Z', endDate: '2019-02-23T12:00:00.000Z' };
      const event = eventsList[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 404 error as event is not found', async () => {
      const payload = { startDate: '2019-01-23T10:00:00.000Z', endDate: '2019-02-23T12:00:00.000Z' };
      const invalidId = new ObjectID('5cf7defc3d14e9701967acf7');

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${invalidId.toHexString()}`,
        payload,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /events/{_id}', () => {
    it('should delete corresponding event', async () => {
      const event = eventsList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${event._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error as event is not found', async () => {
      const invalidId = new ObjectID('5cf7defc3d14e9701967acf7');

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${invalidId.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
