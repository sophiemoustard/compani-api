const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const qs = require('qs');
const omit = require('lodash/omit');
const {
  populateDB,
  eventsList,
  eventAuxiliary,
  customerAuxiliary,
  sector,
  thirdPartyPayer,
} = require('./seed/eventsSeed');
const { getToken } = require('./seed/authentificationSeed');
const app = require('../../server');
const { INTERVENTION, ABSENCE, UNAVAILABILITY, INTERNAL_HOUR, ILLNESS, DAILY } = require('../../helpers/constants');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENTS ROUTES', () => {
  let authToken = null;

  describe('GET /events', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
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

      it('should return a list of events groupedBy customers', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/events?groupBy=customer&type=intervention',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toEqual(200);
        expect(response.result.data.events).toBeDefined();
        expect(response.result.data.events[0]._id).toBeDefined();
        expect(response.result.data.events[0].events).toBeDefined();
        response.result.data.events[0].events.forEach((event) => {
          expect(event.customer._id).toEqual(response.result.data.events[0]._id);
        });
      });

      it('should return a list of events groupedBy auxiliaries', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/events?groupBy=auxiliary',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toEqual(200);
        expect(response.result.data.events).toBeDefined();
        expect(response.result.data.events[0]._id).toBeDefined();
        expect(response.result.data.events[0].events).toBeDefined();
        response.result.data.events[0].events.forEach((event) => {
          expect(event.auxiliary._id).toEqual(response.result.data.events[0]._id);
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

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 200 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'coach', expectedCode: 200 },
        { name: 'planningReferent', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const request = {
            method: 'GET',
            url: '/events',
          };

          if (!role.customCredentials) {
            authToken = await getToken(role.name);
            request.headers = { 'x-access-token': authToken };
          } else {
            request.credentials = role.customCredentials;
          }

          const response = await app.inject(request);

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /events/credit-notes', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should return a list of billed events for specified customer', async () => {
        const query = {
          startDate: moment('2019-01-01').toDate(),
          endDate: moment('2019-01-20').toDate(),
          customer: customerAuxiliary._id.toHexString(),
          isBilled: true,
        };

        const response = await app.inject({
          method: 'GET',
          url: `/events/credit-notes?${qs.stringify(query)}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toEqual(200);
        expect(response.result.data.events).toBeDefined();
        const filteredEvents = eventsList.filter(ev => ev.isBilled && !ev.bills.inclTaxesTpp);
        expect(response.result.data.events.length).toBe(filteredEvents.length);
      });

      it('should return a list of billed events for specified customer and tpp', async () => {
        const query = {
          startDate: moment('2019-01-01').toDate(),
          endDate: moment('2019-01-20').toDate(),
          customer: customerAuxiliary._id.toHexString(),
          thirdPartyPayer: thirdPartyPayer._id.toHexString(),
          isBilled: true,
        };

        const response = await app.inject({
          method: 'GET',
          url: `/events/credit-notes?${qs.stringify(query)}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toEqual(200);
        expect(response.result.data.events).toBeDefined();
        const filteredEvents = eventsList.filter(ev => ev.isBilled && ev.bills.inclTaxesTpp);
        expect(response.result.data.events.length).toBe(filteredEvents.length);
      });

      it('should return an empty list as no event is matching the request', async () => {
        const query = {
          startDate: moment('2017-01-01').toDate(),
          endDate: moment('2017-01-20').toDate(),
          customer: customerAuxiliary._id.toHexString(),
          isBilled: true,
        };

        const response = await app.inject({
          method: 'GET',
          url: `/events/credit-notes?${qs.stringify(query)}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toEqual(200);
        expect(response.result.data.events).toEqual([]);
      });

      const wrongParams = ['startDate', 'endDate', 'customer', 'isBilled'];
      wrongParams.forEach((param) => {
        it(`should return a 400 error if missing '${param}' parameter`, async () => {
          const query = {
            startDate: moment('2019-01-01').toDate(),
            endDate: moment('2019-01-20').toDate(),
            customer: customerAuxiliary._id.toHexString(),
            isBilled: true,
          };
          const wrongQuery = omit(query, param);

          const response = await app.inject({
            method: 'GET',
            url: `/events/credit-notes?${qs.stringify(wrongQuery)}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(400);
        });
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 403 },
        { name: 'coach', expectedCode: 403 },
        { name: 'planningReferent', expectedCode: 403 },
      ];
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliary._id.toHexString(),
        isBilled: true,
      };

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);

          const response = await app.inject({
            method: 'GET',
            url: `/events/credit-notes?${qs.stringify(query)}`,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST /events', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });
      it('should create an internal hour', async () => {
        const auxiliary = eventAuxiliary;
        const payload = {
          type: INTERNAL_HOUR,
          startDate: '2019-01-23T10:00:00.000+01:00',
          endDate: '2019-01-23T12:30:00.000+01:00',
          auxiliary: auxiliary._id,
          sector: sector._id,
          address: {
            fullAddress: '4 rue du test 92160 Antony',
            street: '4 rue du test',
            zipCode: '92160',
            city: 'Antony',
          },
          internalHour: {
            name: 'Formation',
            _id: new ObjectID('5cf7defc3d14e9701967acf7'),
            default: false,
          },
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
        const auxiliary = eventAuxiliary;
        const customer = customerAuxiliary;
        const payload = {
          type: INTERVENTION,
          startDate: '2019-01-23T10:00:00.000+01:00',
          endDate: '2019-01-23T12:30:00.000+01:00',
          auxiliary: auxiliary._id,
          sector: sector._id,
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
        const auxiliary = eventAuxiliary;
        const payload = {
          type: ABSENCE,
          startDate: '2019-01-23T10:00:00.000+01:00',
          endDate: '2019-01-23T12:30:00.000+01:00',
          auxiliary: auxiliary._id,
          sector: sector._id,
          absence: ILLNESS,
          absenceNature: DAILY,
          attachment: {
            driveId: 'qwertyuiop',
            link: 'asdfghjkl;',
          },
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
        const auxiliary = eventAuxiliary;
        const payload = {
          type: UNAVAILABILITY,
          startDate: '2019-01-23T10:00:00.000+01:00',
          endDate: '2019-01-23T12:30:00.000+01:00',
          auxiliary: auxiliary._id,
          sector: sector._id,
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
          sector: sector._id,
          address: {
            fullAddress: '4 rue du test 92160 Antony',
            street: '4 rue du test',
            zipCode: '92160',
            city: 'Antony',
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

    describe('Other roles', () => {
      beforeEach(populateDB);

      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00.000+01:00',
        endDate: '2019-01-23T12:30:00.000+01:00',
        auxiliary: eventAuxiliary._id,
        sector: sector._id,
        customer: customerAuxiliary._id,
        subscription: customerAuxiliary.subscriptions[0]._id,
        status: 'contract_with_company',
      };

      const roles = [
        { name: 'helper', expectedCode: 403 },
        {
          name: 'not auxiliary event',
          expectedCode: 403,
          customCredentials: { scope: [`user-${new ObjectID()}`] },
        },
        {
          name: 'auxiliary event',
          expectedCode: 200,
          customCredentials: { scope: [`user-${eventAuxiliary._id}`] },
        },
        { name: 'coach', expectedCode: 200 },
        { name: 'planningReferent', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const request = {
            method: 'POST',
            url: '/events',
            payload,
          };

          if (!role.customCredentials) {
            authToken = await getToken(role.name);
            request.headers = { 'x-access-token': authToken };
          } else {
            request.credentials = role.customCredentials;
          }

          const response = await app.inject(request);

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });


  describe('PUT /events/{_id}', () => {
    describe('Admin', () => {
      beforeEach(populateDB);
      beforeEach(async () => {
        authToken = await getToken('admin');
      });

      it('should update corresponding event', async () => {
        const event = eventsList[0];
        const payload = { startDate: '2019-01-23T10:00:00.000Z', endDate: '2019-01-23T12:00:00.000Z', sector: sector._id, auxiliary: event.auxiliary };

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
        const payload = { beginDate: '2019-01-23T10:00:00.000Z', sector: new ObjectID() };
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
        const payload = { startDate: '2019-01-23T10:00:00.000Z', endDate: '2019-02-23T12:00:00.000Z', sector: sector._id };
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
        const payload = { startDate: '2019-01-23T10:00:00.000Z', endDate: '2019-02-23T12:00:00.000Z', sector: sector._id };
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
    describe('Other roles', () => {
      beforeEach(populateDB);

      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        sector: sector._id,
      };

      const roles = [
        { name: 'helper', expectedCode: 403 },
        {
          name: 'not auxiliary event',
          expectedCode: 403,
          customCredentials: {
            _id: new ObjectID(),
            scope: [`events.auxiliary:${this._id}:edit`],
          },
        },
        {
          name: 'auxiliary event',
          expectedCode: 200,
          customCredentials: {
            _id: eventAuxiliary._id,
            scope: [`events.auxiliary:${eventAuxiliary._id}:edit`],
          },
        },
        { name: 'coach', expectedCode: 200 },
        { name: 'planningReferent', expectedCode: 200 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const request = {
            method: 'PUT',
            url: `/events/${eventsList[2]._id.toHexString()}`,
            payload,
          };

          if (!role.customCredentials) {
            authToken = await getToken(role.name);
            request.headers = { 'x-access-token': authToken };
          } else {
            request.credentials = role.customCredentials;
          }

          const response = await app.inject(request);

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
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
