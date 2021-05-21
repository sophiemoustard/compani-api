const expect = require('expect');
const { ObjectID } = require('mongodb');
const moment = require('moment');
const qs = require('qs');
const omit = require('lodash/omit');
const {
  populateDB,
  eventsList,
  auxiliaries,
  customerAuxiliary,
  sectors,
  thirdPartyPayer,
  helpersCustomer,
  getUserToken,
  internalHour,
  customerFromOtherCompany,
  auxiliaryFromOtherCompany,
  internalHourFromOtherCompany,
  thirdPartyPayerFromOtherCompany,
  eventFromOtherCompany,
} = require('./seed/eventsSeed');
const { getToken, authCompany, getTokenByCredentials } = require('./seed/authenticationSeed');
const { creditNotesList } = require('./seed/creditNotesSeed');
const app = require('../../server');
const {
  INTERVENTION,
  ABSENCE,
  UNAVAILABILITY,
  INTERNAL_HOUR,
  ILLNESS,
  DAILY,
  EVERY_DAY,
  PAID_LEAVE,
  MATERNITY_LEAVE,
  PARENTAL_LEAVE,
} = require('../../src/helpers/constants');
const UtilsHelper = require('../../src/helpers/utils');
const Repetition = require('../../src/models/Repetition');
const Event = require('../../src/models/Event');
const EventHistory = require('../../src/models/EventHistory');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('GET /events', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return a list of events', async () => {
      const startDate = moment('2019-01-18');
      const endDate = moment('2019-01-20');
      const response = await app.inject({
        method: 'GET',
        url: `/events?startDate=${startDate.toDate()}&endDate=${endDate.toDate()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events).toBeDefined();
      response.result.data.events.forEach((event) => {
        expect(moment(event.startDate).isSameOrAfter(startDate)).toBeTruthy();
        expect(moment(event.startDate).isSameOrBefore(endDate)).toBeTruthy();
        if (event.type === 'intervention') expect(event.subscription._id).toBeDefined();
      });
    });

    it('should return a list of events groupedBy customers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?groupBy=customer&type=intervention',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events).toBeDefined();
      const { events } = response.result.data;
      const customerId = Object.keys(events)[0];
      events[customerId].forEach(e => expect(UtilsHelper.areObjectIdsEquals(e.customer._id, customerId)).toBeTruthy());
    });

    it('should return a list of events groupedBy auxiliaries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?groupBy=auxiliary',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events).toBeDefined();
      const { events } = response.result.data;
      const auxId = Object.keys(events)[0];
      events[auxId].forEach(e => expect(UtilsHelper.areObjectIdsEquals(e.auxiliary._id, auxId)).toBeTruthy());
    });

    it('should return a 200 if same id send twice - sectors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?sector=${sectors[0]._id}&sector=${sectors[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return a 200 if same id send twice - auxiliaries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?auxiliary=${auxiliaries[0]._id}&auxiliary=${auxiliaries[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return a 200 if same id send twice - customers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?customer=${customerAuxiliary._id}&customer=${customerAuxiliary._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return a 403 if customer is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?customer=${customerFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if auxiliary is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?auxiliary=${auxiliaryFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?sector=${sectors[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      {
        name: 'helper\'s customer',
        expectedCode: 200,
        url: `/events?customer=${customerAuxiliary._id.toHexString()}`,
        customCredentials: { ...helpersCustomer.local },
      },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'planning_referent', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = role.customCredentials ? await getUserToken(role.customCredentials) : await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: role.url || '/events',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /events/credit-notes', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return a list of billed events for specified customer', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliary._id.toHexString(),
        creditNoteId: creditNotesList._id,
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
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
        creditNoteId: creditNotesList._id,
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    const wrongParams = ['startDate', 'endDate', 'customer'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const query = {
          startDate: moment('2019-01-01').toDate(),
          endDate: moment('2019-01-20').toDate(),
          customer: customerAuxiliary._id.toHexString(),
        };
        const wrongQuery = omit(query, param);

        const response = await app.inject({
          method: 'GET',
          url: `/events/credit-notes?${qs.stringify(wrongQuery)}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    it('should return a 403 if customer is not from the same company', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerFromOtherCompany._id.toHexString(),
        thirdPartyPayer: thirdPartyPayer._id.toHexString(),
        creditNoteId: creditNotesList._id,
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if tpp is not from the same company', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliary._id.toHexString(),
        thirdPartyPayer: thirdPartyPayerFromOtherCompany._id.toHexString(),
        creditNoteId: creditNotesList._id,
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'planning_referent', expectedCode: 200 },
    ];
    const query = {
      startDate: moment('2019-01-01').toDate(),
      endDate: moment('2019-01-20').toDate(),
      customer: customerAuxiliary._id.toHexString(),
      creditNoteId: creditNotesList._id,
    };

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'GET',
          url: `/events/credit-notes?${qs.stringify(query)}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /events/working-stats', () => {
  let authToken = null;
  const startDate = moment('2019-01-17').toDate();
  const endDate = moment('2019-01-20').toDate();
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return working stats for auxiliaries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/working-stats?auxiliary=${auxiliaries[0]._id}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.workingStats[auxiliaries[0]._id]).toBeDefined();
      expect(response.result.data.workingStats[auxiliaries[0]._id].hoursToWork).toEqual(2);
      expect(response.result.data.workingStats[auxiliaries[0]._id].workedHours).toEqual(5.5);
    });

    it('should return working stats for all auxiliaries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/working-stats?startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return a 403 if auxiliary is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/working-stats?auxiliary=${auxiliaryFromOtherCompany._id}&startDate=${startDate}
          &endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'planning_referent', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/events/working-stats?auxiliary=${auxiliaries[0]._id}&startDate=${startDate}&endDate=${endDate}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /events/paid-transport', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return paid transport stats for many sectors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/paid-transport?sector=${sectors[0]._id}&sector=${sectors[1]._id}&month=01-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      const resultForFirstSector = response.result.data.paidTransportStatsBySector
        .find(res => res.sector.toHexString() === sectors[0]._id.toHexString());
      expect(resultForFirstSector.duration).toEqual(0.5);

      const resultForSecondSector = response.result.data.paidTransportStatsBySector
        .find(res => res.sector.toHexString() === sectors[1]._id.toHexString());
      expect(resultForSecondSector.duration).toEqual(0.5);
    });

    it('should return a 403 if sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/paid-transport?sector=${sectors[2]._id}&month=01-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 400 if missing sector', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events/paid-transport?month=01-2020',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if missing month', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/paid-transport?sector=${sectors[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if month does not correspond to regex', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events/paid-transport?month=012020',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'planning_referent', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/events/paid-transport?sector=${sectors[0]._id}&month=01-2020`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('GET /events/unassigned-hours', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should return an empty array if sector does not have unassigned event', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/unassigned-hours?sector=${sectors[0]._id}&month=02-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.unassignedHoursBySector.length).toEqual(0);
    });

    it('should return unassigned hours for many sectors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/unassigned-hours?sector=${sectors[0]._id}&sector=${sectors[1]._id}&month=01-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      const firstSectorResult = response.result.data.unassignedHoursBySector
        .find(el => el.sector.toHexString() === sectors[0]._id.toHexString());
      expect(firstSectorResult.duration).toEqual(5);

      const secondSectorResult = response.result.data.unassignedHoursBySector
        .find(el => el.sector.toHexString() === sectors[1]._id.toHexString());
      expect(secondSectorResult.duration).toEqual(1.5);
    });

    it('should return a 403 if sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/unassigned-hours?sector=${sectors[2]._id}&month=01-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 400 if missing sector', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events/unassigned-hours?month=01-2020',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if missing month', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/unassigned-hours?sector=${sectors[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if month does not correspond to regex', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events/unassigned-hours?month=012020',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200 },
      { name: 'coach', expectedCode: 200 },
      { name: 'planning_referent', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/events/unassigned-hours?sector=${sectors[0]._id}&month=01-2020`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /events', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create an internal hour', async () => {
      const payload = {
        type: INTERNAL_HOUR,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        internalHour: internalHour._id,
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create an intervention with auxiliary', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliary._id.toHexString(),
        subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create an intervention with sector', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        sector: sectors[0]._id.toHexString(),
        customer: customerAuxiliary._id.toHexString(),
        subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create an absence', async () => {
      const auxiliary = auxiliaries[0];
      const payload = {
        type: ABSENCE,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliary._id.toHexString(),
        absence: ILLNESS,
        absenceNature: DAILY,
        attachment: { driveId: 'qwertyuiop', link: 'asdfghjkl;' },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create an unavailability', async () => {
      const payload = {
        type: UNAVAILABILITY,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should create a repetition', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliary._id.toHexString(),
        subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
        repetition: { frequency: EVERY_DAY },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
      const repeatedEventsCount = await Event.countDocuments({
        'repetition.parentId': response.result.data.event._id,
        company: authCompany._id,
      }).lean();
      expect(repeatedEventsCount).toEqual(91);
      const repetition = await Repetition.findOne({ parentId: response.result.data.event._id }).lean();
      expect(repetition).toBeDefined();
    });

    const baseInterventionPayload = {
      type: INTERVENTION,
      startDate: '2019-01-23T10:00:00',
      endDate: '2019-01-23T12:30:00',
      auxiliary: auxiliaries[0]._id.toHexString(),
      customer: customerAuxiliary._id.toHexString(),
      subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
      address: {
        fullAddress: '4 rue du test 92160 Antony',
        street: '4 rue du test',
        zipCode: '92160',
        city: 'Antony',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };
    const interventionMissingParams = [
      { payload: { ...omit(baseInterventionPayload, 'address') }, reason: 'missing address' },
      { payload: { ...omit(baseInterventionPayload, 'address.fullAddress') }, reason: 'missing address.fullAddress' },
      { payload: { ...omit(baseInterventionPayload, 'address.street') }, reason: 'missing address.street' },
      { payload: { ...omit(baseInterventionPayload, 'address.zipCode') }, reason: 'missing address.zipCode' },
      { payload: { ...omit(baseInterventionPayload, 'address.city') }, reason: 'missing address.city' },
      { payload: { ...omit(baseInterventionPayload, 'address.location') }, reason: 'missing address.location' },
      {
        payload: { ...omit(baseInterventionPayload, 'address.location.coordinates') },
        reason: 'missing address.location.coordinates',
      },
      {
        payload: { ...omit(baseInterventionPayload, 'address.location.type') },
        reason: 'missing address.location.type',
      },
      { payload: { ...omit(baseInterventionPayload, 'customer') }, reason: 'missing customer' },
      { payload: { ...omit(baseInterventionPayload, 'subscription') }, reason: 'missing subscription' },
      { payload: { ...omit(baseInterventionPayload, 'type') }, reason: 'missing type' },
      { payload: { ...omit(baseInterventionPayload, 'startDate') }, reason: 'missing startDate' },
      { payload: { ...omit(baseInterventionPayload, 'endDate') }, reason: 'missing endDate' },
    ];
    interventionMissingParams.forEach((test) => {
      it(`should return a 400 error as intervention payload is invalid: ${test.reason}`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/events',
          payload: test.payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(response.statusCode).toEqual(400);
      });
    });

    const baseInternalHourPayload = {
      type: INTERNAL_HOUR,
      startDate: '2019-01-23T10:00:00',
      endDate: '2019-01-23T12:30:00',
      auxiliary: auxiliaries[0]._id.toHexString(),
      internalHour: internalHour._id,
    };
    const internalHourMissingParams = [
      { payload: { ...omit(baseInternalHourPayload, 'internalHour') }, reason: 'missing internalHour' },
      { payload: { ...omit(baseInternalHourPayload, 'startDate') }, reason: 'missing startDate' },
      { payload: { ...omit(baseInternalHourPayload, 'endDate') }, reason: 'missing endDate' },
      { payload: { ...omit(baseInternalHourPayload, 'auxiliary') }, reason: 'missing auxiliary' },
    ];
    internalHourMissingParams.forEach((test) => {
      it(`should return a 400 error as internal hour payload is invalid: ${test.reason}`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/events',
          payload: test.payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(response.statusCode).toEqual(400);
      });
    });

    const baseAbsencePayload = {
      type: ABSENCE,
      startDate: '2019-01-23T10:00:00',
      endDate: '2019-01-23T12:30:00',
      auxiliary: auxiliaries[0]._id.toHexString(),
      absence: ILLNESS,
      absenceNature: DAILY,
      attachment: { driveId: 'qwertyuiop', link: 'asdfghjkl;' },
    };
    const absenceMissingParams = [
      { payload: { ...omit(baseAbsencePayload, 'absence') }, reason: 'missing absence' },
      { payload: { ...omit(baseAbsencePayload, 'absenceNature') }, reason: 'missing absenceNature' },
      { payload: { ...omit(baseAbsencePayload, 'startDate') }, reason: 'missing startDate' },
      { payload: { ...omit(baseAbsencePayload, 'endDate') }, reason: 'missing endDate' },
      { payload: { ...omit(baseAbsencePayload, 'auxiliary') }, reason: 'missing auxiliary' },
      { payload: { ...omit(baseAbsencePayload, 'attachment') }, reason: 'missing attachment on illness' },
    ];
    absenceMissingParams.forEach((test) => {
      it(`should return a 400 error as absence payload is invalid: ${test.reason}`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/events',
          payload: test.payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(response.statusCode).toEqual(400);
      });
    });

    const baseUnavailabilityPayload = {
      type: UNAVAILABILITY,
      startDate: '2019-01-23T10:00:00',
      endDate: '2019-01-23T12:30:00',
      auxiliary: auxiliaries[0]._id.toHexString(),
    };
    const unavailabilityMissingParams = [
      { payload: { ...omit(baseUnavailabilityPayload, 'startDate') }, reason: 'missing startDate' },
      { payload: { ...omit(baseUnavailabilityPayload, 'endDate') }, reason: 'missing endDate' },
      { payload: { ...omit(baseUnavailabilityPayload, 'auxiliary') }, reason: 'missing auxiliary' },
    ];
    unavailabilityMissingParams.forEach((test) => {
      it(`should return a 400 error as unavailability payload is invalid: ${test.reason}`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/events',
          payload: test.payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(response.statusCode).toEqual(400);
      });
    });

    it('should return a 400 error as payload contains auxiliary and sector', async () => {
      const payload = {
        type: 'intervention',
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: new ObjectID(),
        customer: new ObjectID(),
        subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
        sector: sectors[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toEqual(400);
    });

    it('should return a 403 if customer is not from the same company', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerFromOtherCompany._id.toHexString(),
        subscription: customerFromOtherCompany.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if the subscription is not for the customer', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliary._id.toHexString(),
        subscription: customerFromOtherCompany.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if auxiliary is not from the same company', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaryFromOtherCompany._id.toHexString(),
        customer: customerAuxiliary._id.toHexString(),
        subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if internalHour is not from the same company', async () => {
      const payload = {
        type: INTERNAL_HOUR,
        internalHour: internalHourFromOtherCompany._id,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if service is archived', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2020-09-23T10:00:00',
        endDate: '2020-09-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliary._id.toHexString(),
        subscription: customerAuxiliary.subscriptions[2]._id.toHexString(),
        address: {
          fullAddress: '4 rue du test 92160 Antony',
          street: '4 rue du test',
          zipCode: '92160',
          city: 'Antony',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should create an extended absence', async () => {
      const payload = {
        type: ABSENCE,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: eventsList[20].auxiliary,
        absenceNature: DAILY,
        absence: PARENTAL_LEAVE,
        extension: eventsList[20]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.event).toBeDefined();
    });

    it('should return 403 if absence extension and extended absence are not for the same valid reason', async () => {
      const payload = {
        type: ABSENCE,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: eventsList[20].auxiliary,
        absenceNature: DAILY,
        absence: MATERNITY_LEAVE,
        extension: eventsList[20]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return 403 if extended absence reason is invalid', async () => {
      const payload = {
        type: ABSENCE,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: eventsList[1].auxiliary,
        absenceNature: DAILY,
        absence: PAID_LEAVE,
        extension: eventsList[1]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return 403 if event startDate is before extended absence startDate', async () => {
      const payload = {
        type: ABSENCE,
        startDate: '2019-01-17T10:00:00',
        endDate: '2019-01-17T12:30:00',
        auxiliary: eventsList[20].auxiliary,
        absenceNature: DAILY,
        absence: PARENTAL_LEAVE,
        extension: eventsList[20]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const payload = {
      type: INTERVENTION,
      startDate: '2019-01-23T10:00:00',
      endDate: '2019-01-23T12:30:00',
      auxiliary: auxiliaries[0]._id.toHexString(),
      customer: customerAuxiliary._id.toHexString(),
      subscription: customerAuxiliary.subscriptions[0]._id.toHexString(),
      address: {
        fullAddress: '4 rue du test 92160 Antony',
        street: '4 rue du test',
        zipCode: '92160',
        city: 'Antony',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'auxiliary', expectedCode: 403, erp: true },
      { name: 'auxiliary_without_company', expectedCode: 403, erp: true },
      { name: 'planning_referent', expectedCode: 200, erp: true },
      {
        name: 'auxiliary event',
        expectedCode: 200,
        erp: true,
        customCredentials: auxiliaries[0].local,
      },
      {
        name: 'auxiliary, unassigned event, same sector ',
        expectedCode: 200,
        erp: true,
        customCredentials: auxiliaries[0].local,
        customPayload: { ...omit(payload, 'auxiliary'), sector: sectors[0]._id },
      },
      { name: 'coach', expectedCode: 200, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = role.customCredentials
          ? await getUserToken(role.customCredentials)
          : await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/events',
          payload: role.customPayload || payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PUT /events/{_id}', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update corresponding event with sector', async () => {
      const event = eventsList[2];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        sector: sectors[0]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.event).toBeDefined();
      expect(response.result.data.event._id).toEqual(event._id);
      expect(moment(response.result.data.event.startDate).isSame(moment(payload.startDate))).toBeTruthy();
      expect(moment(response.result.data.event.endDate).isSame(moment(payload.endDate))).toBeTruthy();
    });

    it('should update corresponding event with auxiliary', async () => {
      const event = eventsList[0];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.event).toBeDefined();
      expect(response.result.data.event._id).toEqual(event._id);
      expect(moment(response.result.data.event.startDate).isSame(moment(payload.startDate))).toBeTruthy();
      expect(moment(response.result.data.event.endDate).isSame(moment(payload.endDate))).toBeTruthy();
    });

    it('should update intervention with auxiliary', async () => {
      const event = eventsList[2];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: auxiliaries[1]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update intervention with other subscription', async () => {
      const event = eventsList[2];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
        subscription: customerAuxiliary.subscriptions[1]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update intervention even if sub service is archived if it was already the selected sub', async () => {
      const event = eventsList[19];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
        subscription: customerAuxiliary.subscriptions[2]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should update internalhour if address is {}', async () => {
      const event = eventsList[0];
      const payload = { auxiliary: event.auxiliary.toHexString(), address: {} };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.event.address).toBeUndefined();
    });

    it('should return a 400 if event is not an internal hours and adress is {}', async () => {
      const event = eventsList[2];
      const payload = { address: {} };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error as payload is invalid', async () => {
      const payload = { beginDate: '2019-01-23T10:00:00.000Z', sector: new ObjectID() };
      const event = eventsList[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error as startDate and endDate are not on the same day', async () => {
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-02-23T12:00:00.000Z',
        sector: sectors[0]._id.toHexString(),
      };
      const event = eventsList[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 if auxiliary is not from the same company', async () => {
      const event = eventsList[0];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-02-23T12:00:00.000Z',
        auxiliary: auxiliaryFromOtherCompany._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 error as event is not found', async () => {
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-02-23T12:00:00.000Z',
        sector: sectors[0]._id.toHexString(),
      };
      const invalidId = new ObjectID();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${invalidId.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if the subscription is not for the customer', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[0]._id.toHexString(),
        subscription: customerFromOtherCompany.subscriptions[0]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 400 if auxiliary sector and auxiliary are in the payload', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[0]._id.toHexString(),
        auxiliary: auxiliaryFromOtherCompany._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 400 if both auxiliary sector and auxiliary are missing', async () => {
      const event = eventsList[0];
      const payload = { subscription: customerFromOtherCompany.subscriptions[0]._id.toHexString() };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 403 if internalHour is not from the same company', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[0]._id.toHexString(),
        internalHour: internalHourFromOtherCompany._id,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if sector is not from the same company', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[2]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if event is not from the same company', async () => {
      const event = eventFromOtherCompany;
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if service is archived', async () => {
      const event = eventsList[2];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
        subscription: customerAuxiliary.subscriptions[2]._id.toHexString(),
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[0]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const payload = {
      startDate: '2019-01-23T10:00:00.000Z',
      endDate: '2019-01-23T12:00:00.000Z',
      sector: sectors[0]._id.toHexString(),
    };

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 200 },
      { name: 'auxiliary event', expectedCode: 200, customCredentials: auxiliaries[0].local },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = role.customCredentials ? await getUserToken(role.customCredentials) : await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/events/${eventsList[2]._id.toHexString()}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /events/{_id}', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete corresponding event', async () => {
      const event = eventsList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${event._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error as event is not found', async () => {
      const invalidId = new ObjectID();

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${invalidId.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if event is not from the same company', async () => {
      const event = eventFromOtherCompany;

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${event._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 200 },
      { name: 'auxiliary event', expectedCode: 200, customCredentials: auxiliaries[0].local },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = role.customCredentials ? await getUserToken(role.customCredentials) : await getToken(role.name);

        const response = await app.inject({
          method: 'DELETE',
          url: `/events/${eventsList[2]._id.toHexString()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /events', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete all events from startDate including repetitions', async () => {
      const customer = customerAuxiliary._id;
      const startDate = '2019-10-14';
      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(await Repetition.find({ company: authCompany._id }).lean()).toHaveLength(0);
    });

    it('should delete all events from startDate to endDate', async () => {
      const customer = customerAuxiliary._id;
      const startDate = '2019-10-14';
      const endDate = '2019-10-16';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should not delete events if one event is billed', async () => {
      const customer = customerAuxiliary._id;
      const startDate = '2019-01-01';
      const endDate = '2019-10-16';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(409);
    });

    it('should return a 403 if customer is not from the company', async () => {
      const startDate = '2019-01-01';
      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customerFromOtherCompany._id}&startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      const customer = customerAuxiliary._id;
      const startDate = '2019-10-14';
      const endDate = '2019-10-16';

      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('DELETE /{_id}/repetition', () => {
  let authToken = null;
  describe('CLIENT_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete repetition', async () => {
      const event = eventsList[18];
      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${event._id.toHexString()}/repetition`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const repetitionCount = await Repetition.countDocuments({
        company: authCompany._id,
        'repetition.parentId': event.repetition.parentId,
      });
      expect(repetitionCount).toEqual(0);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 200, customCredentials: auxiliaries[0].local },
      { name: 'planning_referent', expectedCode: 200 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = role.customCredentials ? await getUserToken(role.customCredentials) : await getToken(role.name);
        const event = eventsList[18];
        const response = await app.inject({
          method: 'DELETE',
          url: `/events/${event._id.toHexString()}/repetition`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('PUT /{_id}/timestamping', () => {
  let authToken;
  describe('AUXILIARY', () => {
    beforeEach(populateDB);

    it('should timestamp startDate of an event', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const startDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(200);
      const timestamp = await EventHistory.countDocuments({
        'event.eventId': eventsList[21]._id,
        'event.startDate': startDate,
        action: 'manual_time_stamping',
        manualTimeStampingReason: 'camera_error',

      });
      expect(timestamp).toBe(1);
    });

    it('should timestamp endDate of an event', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const endDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { endDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(200);
      const timestamp = await EventHistory.countDocuments({
        'event.eventId': eventsList[21]._id,
        'event.endDate': endDate,
        action: 'manual_time_stamping',
        manualTimeStampingReason: 'camera_error',

      });
      expect(timestamp).toBe(1);
    });

    it('should return a 404 if event does not exist', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${new ObjectID()}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate: new Date(), action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if event is not an intervention', async () => {
      authToken = await getTokenByCredentials(auxiliaries[1].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[22]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate: new Date(), action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if auxiliary is not the one of the intervention', async () => {
      authToken = await getTokenByCredentials(auxiliaries[1].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate: new Date(), action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if the event is not today', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const startDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[2]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 409 if event is already timestamped', async () => {
      authToken = await getTokenByCredentials(auxiliaries[2].local);
      const startDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[23]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return 400 if incorrect action', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const startDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, action: 'poiu', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if incorrect reason', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const startDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, action: 'manual_time_stamping', reason: 'qwer' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if no endDate and no startDate', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if endDate and startDate', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const startDate = new Date();
      const endDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, endDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(400);
    });

    const payload = { startDate: new Date(), action: 'manual_time_stamping', reason: 'camera_error' };
    const missingFields = ['action', 'reason'];

    missingFields.forEach((field) => {
      it(`should return a 400 if missing field ${field}`, async () => {
        authToken = await getTokenByCredentials(auxiliaries[0].local);

        const response = await app.inject({
          method: 'PUT',
          url: `/events/${eventsList[21]._id}/timestamping`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: omit(payload, field),
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);

        const response = await app.inject({
          method: 'PUT',
          url: `/events/${eventsList[21]._id}/timestamping`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { startDate: new Date(), action: 'manual_time_stamping', reason: 'camera_error' },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
