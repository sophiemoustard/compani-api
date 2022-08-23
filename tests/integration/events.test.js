const expect = require('expect');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const qs = require('qs');
const omit = require('lodash/omit');
const {
  populateDB,
  eventsList,
  auxiliaries,
  customerAuxiliaries,
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
  creditNote,
  creditNoteFromOtherCompany,
  repetitionParentId,
} = require('./seed/eventsSeed');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');
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
  NEVER,
  INVOICED_AND_PAID,
  AUXILIARY_INITIATIVE,
} = require('../../src/helpers/constants');
const UtilsHelper = require('../../src/helpers/utils');
const CompaniDatesHelper = require('../../src/helpers/dates/companiDates');
const Repetition = require('../../src/models/Repetition');
const Event = require('../../src/models/Event');
const EventHistory = require('../../src/models/EventHistory');
const CustomerAbsence = require('../../src/models/CustomerAbsence');
const UtilsMock = require('../utilsMock');

describe('NODE ENV', () => {
  it('should be "test"', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EVENTS ROUTES - GET /events', () => {
  let authToken;
  describe('AUXILIARY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should return a list of events', async () => {
      const startDate = new Date('2019-01-17');
      const endDate = new Date('2019-01-20');
      const isCancelled = false;
      const response = await app.inject({
        method: 'GET',
        url: `/events?startDate=${startDate}&endDate=${endDate}&isCancelled=${isCancelled}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      response.result.data.events.forEach((event) => {
        expect(CompaniDatesHelper.CompaniDate(event.startDate).isSameOrAfter(startDate)).toBeTruthy();
        expect(CompaniDatesHelper.CompaniDate(event.startDate).isSameOrBefore(endDate)).toBeTruthy();
      });
    });

    it('should return a list of events groupedBy customers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?groupBy=customer&type=intervention',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      const { events } = response.result.data;
      const customerId = Object.keys(events)[0];
      events[customerId].forEach((e) => {
        expect(UtilsHelper.areObjectIdsEquals(e.customer._id, customerId)).toBeTruthy();
        expect(e.startDateTimeStamp).toBeDefined();
        expect(e.endDateTimeStamp).toBeDefined();
      });
    });

    it('should return a list of events groupedBy auxiliaries', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?groupBy=auxiliary',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      const { events } = response.result.data;
      const auxId = Object.keys(events)[0];
      events[auxId].forEach((e) => {
        expect(UtilsHelper.areObjectIdsEquals(e.auxiliary._id, auxId)).toBeTruthy();
        expect(e.startDateTimeStamp).toBeDefined();
        expect(e.endDateTimeStamp).toBeDefined();
      });
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
        url: `/events?customer=${customerAuxiliaries[0]._id}&customer=${customerAuxiliaries[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
    });

    it('should return a 404 if customer is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?customer=${customerFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if auxiliary is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?auxiliary=${auxiliaryFromOtherCompany._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events?sector=${sectors[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return 400 if groupBy is an unauthorized string', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?groupBy=oiuy&type=intervention',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return 400 if type is an unauthorized string', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/events?groupBy=customer&type=oiuy',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      {
        name: 'helper\'s customer',
        expectedCode: 200,
        url: `/events?customer=${customerAuxiliaries[0]._id.toHexString()}`,
        customCredentials: { ...helpersCustomer.local },
      },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = role.customCredentials
          ? await getUserToken(role.customCredentials)
          : await getToken(role.name, role.erp);
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

describe('EVENTS ROUTES - GET /events/credit-notes', () => {
  let authToken;
  describe('AUXILIARY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should return a list of billed events for specified customer', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliaries[0]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      const isBilledAndNotTpp = ev => ev.isBilled && !ev.bills.inclTaxesTpp;
      expect(response.result.data.events.every(isBilledAndNotTpp)).toBeTruthy();
      const countFilteredEventsFromSeeds = eventsList.filter(isBilledAndNotTpp).length;
      expect(response.result.data.events.length).toBe(countFilteredEventsFromSeeds);
    });

    it('should return a list of billed events for specified customer, tpp and creditNote', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        thirdPartyPayer: thirdPartyPayer._id.toHexString(),
        creditNoteId: creditNote._id.toHexString(),
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
      expect(response.result.data.events.length).toBe(1);
      expect(response.result.data.events[0].isBilled).toBeTruthy();
    });

    const wrongParams = ['startDate', 'endDate', 'customer'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const query = {
          startDate: moment('2019-01-01').toDate(),
          endDate: moment('2019-01-20').toDate(),
          customer: customerAuxiliaries[0]._id.toHexString(),
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

    it('should return a 404 if credit note is not from the same company', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        thirdPartyPayer: thirdPartyPayer._id.toHexString(),
        creditNoteId: creditNoteFromOtherCompany._id.toHexString(),
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if customer is not from the same company', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerFromOtherCompany._id.toHexString(),
        thirdPartyPayer: thirdPartyPayer._id.toHexString(),
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if tpp is not from the same company', async () => {
      const query = {
        startDate: moment('2019-01-01').toDate(),
        endDate: moment('2019-01-20').toDate(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        thirdPartyPayer: thirdPartyPayerFromOtherCompany._id.toHexString(),
      };

      const response = await app.inject({
        method: 'GET',
        url: `/events/credit-notes?${qs.stringify(query)}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];
    const query = {
      startDate: moment('2019-01-01').toDate(),
      endDate: moment('2019-01-20').toDate(),
      customer: customerAuxiliaries[0]._id.toHexString(),
    };

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);

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

describe('EVENTS ROUTES - GET /events/working-stats', () => {
  let authToken;
  const startDate = moment('2019-01-17').toDate();
  const endDate = moment('2019-01-20').toDate();
  describe('AUXILIARY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should return working stats for auxiliary', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/working-stats?auxiliary=${auxiliaries[0]._id}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);
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

      const countWorkingStats = Object.keys(response.result.data.workingStats).length;
      expect(countWorkingStats).toBe(auxiliaries.length);
    });

    it('should return a 404 if auxiliary is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/working-stats?auxiliary=${auxiliaryFromOtherCompany._id}&startDate=${startDate}
          &endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
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

describe('EVENTS ROUTES - GET /events/paid-transport', () => {
  let authToken;
  describe('AUXILIARY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
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

    it('should return a 404 if sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/paid-transport?sector=${sectors[2]._id}&month=01-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
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
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
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

describe('EVENTS ROUTES - GET /events/unassigned-hours', () => {
  let authToken;
  describe('AUXILIARY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
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

    it('should return a 404 if sector is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/events/unassigned-hours?sector=${sectors[2]._id}&month=01-2020`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
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
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
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

describe('EVENTS ROUTES - POST /events', () => {
  let authToken;
  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('planning_referent');
      UtilsMock.mockCurrentDate('2019-01-24T15:00:00.000Z');
    });
    afterEach(() => {
      UtilsMock.unmockCurrentDate();
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

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length + 1);
    });

    it('should create an intervention with auxiliary', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length + 1);
    });

    it('should create an intervention with sector', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        sector: sectors[0]._id.toHexString(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length + 1);
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

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length + 1);
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

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length + 1);
    });

    it('should create an unavailability', async () => {
      const payload = {
        type: UNAVAILABILITY,
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:30:00.000Z',
        auxiliary: auxiliaries[0]._id,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/events',
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(200);

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length + 1);
    });

    it('should create a repetition', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:30:00.000Z',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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
      const repeatedEventsCount = await Event.countDocuments({
        'repetition.parentId': response.result.data.event._id,
        company: authCompany._id,
      });
      expect(repeatedEventsCount).toEqual(91);
      const repetition = await Repetition.countDocuments({ parentId: response.result.data.event._id });
      expect(repetition).toBe(1);
    });

    const baseInterventionPayload = {
      type: INTERVENTION,
      startDate: '2019-01-23T10:00:00',
      endDate: '2019-01-23T12:30:00',
      auxiliary: auxiliaries[0]._id.toHexString(),
      customer: customerAuxiliaries[0]._id.toHexString(),
      subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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
        auxiliary: new ObjectId(),
        customer: new ObjectId(),
        subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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

    it('should return a 404 if customer is not from the same company', async () => {
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

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 403 if the subscription is not for the customer', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliaries[0]._id.toHexString(),
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

    it('should return a 403 if the customer is archived', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T12:00:00',
        endDate: '2019-01-23T13:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliaries[2]._id.toHexString(),
        subscription: customerAuxiliaries[2].subscriptions[0]._id.toHexString(),
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

    it('should return a 404 if auxiliary is not from the same company', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaryFromOtherCompany._id.toHexString(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if internalHour is not from the same company', async () => {
      const payload = {
        type: INTERNAL_HOUR,
        internalHour: internalHourFromOtherCompany._id,
        startDate: '2019-01-23T10:00:00',
        endDate: '2019-01-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 403 if service is archived', async () => {
      const payload = {
        type: INTERVENTION,
        startDate: '2020-09-23T10:00:00',
        endDate: '2020-09-23T12:30:00',
        auxiliary: auxiliaries[0]._id.toHexString(),
        customer: customerAuxiliaries[0]._id.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[2]._id.toHexString(),
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

    it('should return 400 if extended absence reason is invalid', async () => {
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

      expect(response.statusCode).toEqual(400);
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
      customer: customerAuxiliaries[0]._id.toHexString(),
      subscription: customerAuxiliaries[0].subscriptions[0]._id.toHexString(),
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
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
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

describe('EVENTS ROUTES - PUT /events/{_id}', () => {
  let authToken;

  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('planning_referent');
    });

    it('should update corresponding event with startDate, endDate, subscription and sector', async () => {
      const event = eventsList[2];
      const subscriptionId = customerAuxiliaries[0].subscriptions[1]._id.toHexString();
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        sector: sectors[0]._id.toHexString(),
        subscription: subscriptionId,
        cancel: { condition: '', reason: '' },
        isCancelled: false,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const resultEvent = response.result.data.event;
      expect(resultEvent._id).toEqual(event._id);
      expect(resultEvent.subscription._id.toHexString()).toBe(subscriptionId);
      expect(moment(resultEvent.startDate).isSame(moment(payload.startDate))).toBeTruthy();
      expect(moment(resultEvent.endDate).isSame(moment(payload.endDate))).toBeTruthy();
      expect(resultEvent.sector.toHexString()).toBe(payload.sector);
    });

    it('should update events and repetition with startDate, endDate', async () => {
      const event = eventsList[9];
      const payload = {
        startDate: new Date('2019-10-16T10:00:00.000Z'), // testing dateJS on purpose
        endDate: '2019-10-16T14:00+02:00', // ~ 2019-10-16T12:00:00.000Z, testing incomplete ISO on purpose
        auxiliary: event.auxiliary.toHexString(),
        shouldUpdateRepetition: true,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const updatedRepetition = await Repetition.countDocuments({
        parentId: repetitionParentId,
        startDate: '2019-10-16T10:00:00.000Z',
        endDate: '2019-10-16T12:00:00.000Z',
      });
      expect(updatedRepetition).toBeTruthy();

      const updatedEvent1 = await Event.countDocuments({
        _id: eventsList[9]._id,
        startDate: '2019-10-16T10:00:00.000Z',
        endDate: '2019-10-16T12:00:00.000Z',
      });
      expect(updatedEvent1).toBeTruthy();

      const updatedEvent2 = await Event.countDocuments({
        _id: eventsList[18]._id,
        startDate: '2019-10-23T10:00:00.000Z',
        endDate: '2019-10-23T12:00:00.000Z',
      });
      expect(updatedEvent2).toBeTruthy();
    });

    it('should update intervention even if sub service is archived if it was already the selected sub', async () => {
      const event = eventsList[19];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[2]._id.toHexString(),
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
      const payload = {
        auxiliary: event.auxiliary.toHexString(),
        address: {},
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.event.address).toBeUndefined();
    });

    it('should return a 400 if no startDate and endDate', async () => {
      const event = eventsList[0];
      const payload = {
        auxiliary: event.auxiliary.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if event is not an internal hours and adress is {}', async () => {
      const event = eventsList[2];
      const payload = {
        address: {},
        startDate: '2019-01-16T09:30:19.543Z',
        endDate: '2019-01-16T11:30:21.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error as startDate is after endDate', async () => {
      const event = eventsList[0];
      const payload = {
        startDate: '2019-01-23T20:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.result.message.endsWith('endDate must be greater than startDate')).toBeTruthy();
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

    it('should return a 404 if auxiliary is not from the same company', async () => {
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

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 if customer is archived', async () => {
      const event = eventsList[26];

      const payload = {
        misc: 'Quelle jolie note !',
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-02-23T12:00:00.000Z',
        auxiliary: auxiliaries[2]._id.toHexString(),
        subscription: event.subscription,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 403 if the subscription is not for the customer', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[0]._id.toHexString(),
        subscription: customerFromOtherCompany.subscriptions[0]._id.toHexString(),
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
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
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
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
      const payload = {
        subscription: customerFromOtherCompany.subscriptions[0]._id.toHexString(),
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(400);
    });

    it('should return a 404 if internalHour is not from the same company', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[0]._id.toHexString(),
        internalHour: internalHourFromOtherCompany._id,
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if sector is not from the same company', async () => {
      const event = eventsList[0];
      const payload = {
        sector: sectors[2]._id.toHexString(),
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${event._id.toHexString()}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 404 if event is not from the same company', async () => {
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

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 403 if service is archived', async () => {
      const event = eventsList[2];
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        auxiliary: event.auxiliary.toHexString(),
        subscription: customerAuxiliaries[0].subscriptions[2]._id.toHexString(),
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[0]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });

    it('should return a 422 event is startDate timeStamped and user tries to update date', async () => {
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        sector: sectors[0]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[23]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(422);
    });

    it('should return a 422 event is startDate timeStamped and user tries to update auxiliary', async () => {
      const payload = {
        auxiliary: auxiliaries[1]._id,
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[23]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(422);
    });

    it('should return a 422 event is startDate timeStamped and user tries to update isCancelled', async () => {
      const payload = {
        auxiliary: auxiliaries[2]._id,
        isCancelled: true,
        cancel: { condition: INVOICED_AND_PAID, reason: AUXILIARY_INITIATIVE },
        misc: 'blablabla',
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[23]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(422);
    });

    it('should return a 422 event is endDate timeStamped and user tries to update date', async () => {
      const payload = {
        startDate: '2019-01-23T10:00:00.000Z',
        endDate: '2019-01-23T12:00:00.000Z',
        sector: sectors[0]._id.toHexString(),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[24]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(422);
    });

    it('should return a 422 event is endDate timeStamped and user tries to update auxiliary', async () => {
      const payload = {
        auxiliary: auxiliaries[1]._id,
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[24]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(422);
    });

    it('should return a 422 event is endDate timeStamped and user tries to update isCancelled', async () => {
      const payload = {
        auxiliary: auxiliaries[3]._id,
        isCancelled: true,
        cancel: { condition: INVOICED_AND_PAID, reason: AUXILIARY_INITIATIVE },
        misc: 'blablabla',
        startDate: '2019-01-17T10:30:18.653Z',
        endDate: '2019-01-17T12:00:18.653Z',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[24]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(422);
    });

    it('should return a 422 if repetition is invalid', async () => {
      const payload = {
        startDate: '2019-10-23T15:30:19.543Z',
        endDate: '2019-10-23T17:30:19.543Z',
        auxiliary: auxiliaries[0]._id,
        shouldUpdateRepetition: true,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[27]._id}`,
        payload,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(422);
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
      { name: 'auxiliary event', expectedCode: 200, customCredentials: auxiliaries[0].local },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = role.customCredentials
          ? await getUserToken(role.customCredentials)
          : await getToken(role.name, role.erp);

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

describe('EVENTS ROUTES - DELETE /events/{_id}', () => {
  let authToken;
  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('planning_referent');
    });

    it('should delete corresponding event', async () => {
      const event = eventsList[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${event._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);

      const countEventAfterCreation = await Event.countDocuments({ company: authCompany._id });
      expect(countEventAfterCreation).toBe(eventsList.length - 1);
    });

    it('should return a 404 error as event is not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${new ObjectId()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if event is not from the same company', async () => {
      const event = eventFromOtherCompany;

      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${event._id.toHexString()}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(404);
    });

    it('should return a 403 if customer is archived', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${eventsList[26]._id.toHexString()}`,
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
      { name: 'auxiliary event', expectedCode: 200, customCredentials: auxiliaries[0].local },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = role.customCredentials
          ? await getUserToken(role.customCredentials)
          : await getToken(role.name, role.erp);

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

describe('EVENTS ROUTES - DELETE /events', () => {
  let authToken;
  describe('AUXILIARY', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('auxiliary');
    });

    it('should delete all customer events from startDate including repetitions', async () => {
      const customer = customerAuxiliaries[0]._id;
      const startDate = '2019-10-14';
      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const query = { customer, company: authCompany._id, startDate: { $gte: new Date(startDate).toISOString() } };
      const repetitionCount = await Repetition.countDocuments(query);
      expect(repetitionCount).toBe(0);
      const eventCount = await Event.countDocuments(query);
      expect(eventCount).toBe(0);
    });

    it('should delete all customer events from startDate to endDate', async () => {
      const customer = customerAuxiliaries[0]._id;
      const startDate = '2019-10-14';
      const endDate = '2019-10-16';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const countEventAfterCreation = await Event.countDocuments({
        customer,
        company: authCompany._id,
        startDate: { $gte: new Date(startDate).toISOString() },
        endDate: { $lte: new Date(endDate).toISOString() },
      });
      expect(countEventAfterCreation).toBe(0);
    });

    it('should not delete events and not create absence if one event is billed', async () => {
      const customer = customerAuxiliaries[0]._id;
      const startDate = '2019-01-01';
      const endDate = '2019-10-16';
      const absenceType = 'leave';
      const customerAbsencesBefore = await CustomerAbsence.countDocuments({ customer });

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}&absenceType=${absenceType}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
      const customerAbsencesAfter = await CustomerAbsence.countDocuments({ customer });
      expect(customerAbsencesAfter).toEqual(customerAbsencesBefore);
    });

    it('should not delete events if one event is timestamped', async () => {
      const customer = customerAuxiliaries[1]._id;
      const startDate = '2019-10-14';
      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 404 if customer is not from the company', async () => {
      const startDate = '2019-01-01';
      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customerFromOtherCompany._id}&startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should create a customer absence', async () => {
      const customer = customerAuxiliaries[0]._id;
      const startDate = new Date('2020-12-01');
      const endDate = new Date('2020-12-26');
      const absenceType = 'leave';
      const customerAbsenceCountBefore = await CustomerAbsence.countDocuments({
        customer,
        company: authCompany._id,
        absenceType: 'leave',
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}&absenceType=${absenceType}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const customerAbsenceCountAfter = await CustomerAbsence.countDocuments({
        customer,
        company: authCompany._id,
        absenceType: 'leave',
      });
      expect(customerAbsenceCountAfter).toBe(customerAbsenceCountBefore + 1);
    });

    it('should create an absence on the day the customer is stopped', async () => {
      const customer = customerAuxiliaries[4]._id;
      const startDate = '2021-01-15T17:58:15.519Z';
      const endDate = '2021-01-16T23:59:59.999Z';
      const absenceType = 'leave';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}&absenceType=${absenceType}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 403 if customer is stopped', async () => {
      const customer = customerAuxiliaries[4]._id;
      const startDate = '2021-02-14T10:30:18.65';
      const endDate = '2021-02-15T10:30:18.65';
      const absenceType = 'leave';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}&absenceType=${absenceType}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if a customer absence already exists on this period', async () => {
      const customer = customerAuxiliaries[3]._id;
      const startDate = '2021-11-12T10:30:18.653Z';
      const endDate = '2021-11-14T10:30:18.653Z';
      const absenceType = 'hospitalization';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}&absenceType=${absenceType}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if endDate is before startDate', async () => {
      const customer = customerAuxiliaries[0]._id;
      const startDate = '2021-11-05T10:30:18.653';
      const endDate = '2021-11-01T10:30:18.653';
      const absenceType = 'leave';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}&endDate=${endDate}&absenceType=${absenceType}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 if customer is archived', async () => {
      const customer = customerAuxiliaries[2]._id;
      const startDate = '2021-11-05T10:30:18.653';

      const response = await app.inject({
        method: 'DELETE',
        url: `/events?customer=${customer}&startDate=${startDate}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      const customer = customerAuxiliaries[0]._id;
      const startDate = '2019-10-14';
      const endDate = '2019-10-16';

      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
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

describe('EVENTS ROUTES - DELETE /events/{_id}/repetition', () => {
  let authToken;
  describe('PLANNING_REFERENT', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('planning_referent');
    });

    it('should delete repetition', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${eventsList[9]._id.toHexString()}/repetition`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const query = { company: authCompany._id, 'repetition.parentId': eventsList[9]._id };
      const repetitionCount = await Repetition.countDocuments(query);
      expect(repetitionCount).toEqual(0);
      const eventCount = await Event.countDocuments(query);
      expect(eventCount).toEqual(0);
    });

    it('should throw 422 if repetition is invalid', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${eventsList[27]._id}/repetition`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(422);
    });

    it('should return a 403 if customer is archived', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/events/${eventsList[26]._id}/repetition`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toEqual(403);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    describe('AUXILIARY', () => {
      beforeEach(async () => {
        authToken = await getUserToken(auxiliaries[0].local);
      });

      it('should return 200 as auxiliary is event auxiliary', async () => {
        const event = eventsList[9];
        const response = await app.inject({
          method: 'DELETE',
          url: `/events/${event._id.toHexString()}/repetition`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);
      });

      it('should return 200 as auxiliary is from event sector', async () => {
        const event = eventsList[14];
        const response = await app.inject({
          method: 'DELETE',
          url: `/events/${event._id.toHexString()}/repetition`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);
      });
    });

    const roles = [
      { name: 'coach', expectedCode: 200 },
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const event = eventsList[9];
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

describe('EVENTS ROUTES - PUT /events/{_id}/timestamping', () => {
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

    it('should timestamp event endDate and remove event from repetition', async () => {
      authToken = await getTokenByCredentials(auxiliaries[3].local);
      const endDate = new Date();
      const eventId = eventsList[23]._id;

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventId}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { endDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(200);

      const updatedEvent = await Event.countDocuments({ _id: eventId, 'repetition.frequency': NEVER });
      expect(updatedEvent).toEqual(1);
    });

    it('should return a 404 if event does not exist', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${new ObjectId()}/timestamping`,
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

    it('should return a 409 if event is already startDate timestamped', async () => {
      authToken = await getTokenByCredentials(auxiliaries[3].local);
      const startDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[23]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 409 if event is already endDate timestamped', async () => {
      authToken = await getTokenByCredentials(auxiliaries[3].local);
      const endDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[24]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { endDate, action: 'manual_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(409);
    });

    it('should return a 409 if user tries to timeStamp a cancelled event', async () => {
      authToken = await getTokenByCredentials(auxiliaries[2].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[25]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate: new Date(), action: 'manual_time_stamping', reason: 'camera_error' },
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

    it('should return 400 if incorrect reason on manual time stamp', async () => {
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

    it('should return a 400 if missing field action', async () => {
      const payload = { startDate: new Date() };

      authToken = await getTokenByCredentials(auxiliaries[0].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if missing field reason on manual time stamp', async () => {
      const payload = { startDate: new Date(), action: 'manual_time_stamping' };

      authToken = await getTokenByCredentials(auxiliaries[0].local);

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if reason is given on qr code time stamp', async () => {
      authToken = await getTokenByCredentials(auxiliaries[0].local);
      const startDate = new Date();
      const endDate = new Date();

      const response = await app.inject({
        method: 'PUT',
        url: `/events/${eventsList[21]._id}/timestamping`,
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { startDate, endDate, action: 'qr_code_time_stamping', reason: 'camera_error' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    beforeEach(populateDB);

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);

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
