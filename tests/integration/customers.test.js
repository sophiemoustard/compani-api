const flat = require('flat');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const moment = require('moment');
const sinon = require('sinon');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const has = require('lodash/has');
const cloneDeep = require('lodash/cloneDeep');
const { generateFormData, getStream } = require('./utils');
const app = require('../../server');
const {
  populateDB,
  otherCompanyCustomers,
  customersList,
  userList,
  archivedService,
  serviceIdList,
  customerThirdPartyPayers,
  sectorsList,
} = require('./seed/customersSeed');
const Customer = require('../../src/models/Customer');
const CustomerAbsence = require('../../src/models/CustomerAbsence');
const EventHistory = require('../../src/models/EventHistory');
const Repetition = require('../../src/models/Repetition');
const ReferentHistory = require('../../src/models/ReferentHistory');
const CustomerPartner = require('../../src/models/CustomerPartner');
const Event = require('../../src/models/Event');
const Drive = require('../../src/models/Google/Drive');
const Helper = require('../../src/models/Helper');
const { MONTHLY, FIXED, DEATH } = require('../../src/helpers/constants');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany, otherCompany } = require('../seed/authCompaniesSeed');
const UtilsHelper = require('../../src/helpers/utils');
const { CompaniDate } = require('../../src/helpers/dates/companiDates');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CUSTOMERS ROUTES', () => {
  let authToken;
  beforeEach(populateDB);

  describe('POST /customers', () => {
    let addStub;
    beforeEach(() => {
      addStub = sinon.stub(Drive, 'add');
    });
    afterEach(() => {
      addStub.restore();
    });

    const payload = {
      identity: { title: 'mr', lastname: 'leboncoin' },
      contact: {
        primaryAddress: {
          street: '37 rue de Ponthieu',
          zipCode: '75008',
          city: 'Paris',
          fullAddress: '37 rue de Ponthieu 75008 Paris',
          location: { type: 'Point', coordinates: [2.0987, 1.2345] },
        },
      },
    };

    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should create a new customer', async () => {
        const customersBefore = await Customer.countDocuments({ company: authCompany._id });
        addStub.returns({ id: '1234567890', webViewLink: 'http://qwertyuiop' });

        const res = await app.inject({
          method: 'POST',
          url: '/customers',
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(pick(res.result.data.customer.toObject(), ['company', 'identity', 'contact'])).toMatchObject({
          company: authCompany._id,
          identity: { lastname: payload.identity.lastname },
          contact: {
            primaryAddress: {
              street: payload.contact.primaryAddress.street,
              zipCode: payload.contact.primaryAddress.zipCode,
              city: payload.contact.primaryAddress.city,
              fullAddress: payload.contact.primaryAddress.fullAddress,
              location: payload.contact.primaryAddress.location,
            },
          },
        });
        expect(res.result.data.customer.payment.mandates).toBeDefined();
        expect(res.result.data.customer.payment.mandates.length).toEqual(1);
        expect(res.result.data.customer.payment.mandates[0].rum).toBeDefined();
        expect(res.result.data.customer.driveFolder).toEqual({ driveId: '1234567890', link: 'http://qwertyuiop' });

        const customersCount = await Customer.countDocuments({ company: authCompany._id });
        expect(customersCount).toEqual(customersBefore + 1);
      });

      const missingParams = [
        'identity.lastname',
        'identity.title',
        'contact.primaryAddress.street',
        'contact.primaryAddress.zipCode',
        'contact.primaryAddress.city',
        'contact.primaryAddress.fullAddress',
        'contact.primaryAddress.location.type',
        'contact.primaryAddress.location.coordinates',
      ];
      missingParams.forEach((paramPath) => {
        it(`should return a 400 error if missing '${paramPath}' parameter`, async () => {
          const res = await app.inject({
            method: 'POST',
            url: '/customers',
            payload: omit(cloneDeep(payload), paramPath),
            headers: { Cookie: `alenvi_token=${authToken}` },
          });
          expect(res.statusCode).toBe(400);
        });
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403, erp: false },
        { name: 'helper', expectedCode: 403, erp: true },
        { name: 'planning_referent', expectedCode: 403, erp: true },
        { name: 'client_admin', expectedCode: 403, erp: false },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
          authToken = await getToken(role.name, role.erp);
          addStub.returns({ id: '1234567890', webViewLink: 'http://qwertyuiop' });

          const response = await app.inject({
            method: 'POST',
            url: '/customers',
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should get all customers', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/customers',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        const areAllCustomersFromCompany = res.result.data.customers
          .every(c => UtilsHelper.areObjectIdsEquals(c.company, authCompany._id));
        expect(areAllCustomersFromCompany).toBe(true);
        const customersCount = await Customer.countDocuments({ company: authCompany._id });
        expect(res.result.data.customers.length).toEqual(customersCount);
      });

      it('should get archived customers', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/customers?archived=${true}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        const areAllCustomersFromCompany = res.result.data.customers
          .every(c => UtilsHelper.areObjectIdsEquals(c.company, authCompany._id));
        expect(areAllCustomersFromCompany).toBe(true);
        const archivedCustomersCount = await Customer
          .countDocuments({ company: authCompany._id, archivedAt: { $ne: null } });
        expect(res.result.data.customers.length).toEqual(archivedCustomersCount);
      });

      it('should get non-archived customers', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/customers?archived=${false}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        const areAllCustomersFromCompany = res.result.data.customers
          .every(c => UtilsHelper.areObjectIdsEquals(c.company, authCompany._id));
        expect(areAllCustomersFromCompany).toBe(true);
        const notArchivedCustomersCount = await Customer
          .countDocuments({ company: authCompany._id, archivedAt: { $eq: null } });
        expect(res.result.data.customers.length).toEqual(notArchivedCustomersCount);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers',
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });

      it('should get only customers from the company (admin from other company)', async () => {
        authToken = await getTokenByCredentials(userList[4].local);
        const res = await app.inject({
          method: 'GET',
          url: '/customers',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        const areAllCustomersFromCompany = res.result.data.customers
          .every(c => UtilsHelper.areObjectIdsEquals(c.company._id, otherCompany._id));
        expect(areAllCustomersFromCompany).toBe(true);
        expect(res.result.data.customers).toHaveLength(2);
      });
    });
  });

  describe('GET /customers/first-intervention', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should get all customers with first intervention info', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/customers/first-intervention',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        const customersCount = await Customer.countDocuments({ company: authCompany._id });
        expect(Object.values(res.result.data.customers)).toHaveLength(customersCount);
        expect(Object.values(res.result.data.customers).every(cus => has(cus, 'firstIntervention'))).toBeTruthy();
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers',
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });

      it('should get only customers from the company with first intervention info', async () => {
        authToken = await getTokenByCredentials(userList[4].local);
        const res = await app.inject({
          method: 'GET',
          url: '/customers/first-intervention',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(Object.values(res.result.data.customers)).toHaveLength(2);
        expect(Object.values(res.result.data.customers).every(cus => has(cus, 'firstIntervention'))).toBeTruthy();
      });
    });
  });

  describe('GET /customers/billed-events', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should get all not archived customers with billed events', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/customers/billed-events',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customers.length).toEqual(1);
        expect(res.result.data.customers[0].subscriptions.length).toEqual(1);
        expect(res.result.data.customers[0].thirdPartyPayers.length).toEqual(1);
      });

      it('should get only customers with billed events from the company', async () => {
        authToken = await getTokenByCredentials(userList[4].local);
        const res = await app.inject({
          method: 'GET',
          url: '/customers/billed-events',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        const customersFromCompanyCount = await Customer
          .countDocuments({ _id: { $in: res.result.data.customers.map(c => c._id) }, company: otherCompany._id });
        expect(customersFromCompanyCount).toEqual(res.result.data.customers.length);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers/billed-events',
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers/subscriptions', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should get all customers with subscriptions', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/customers/subscriptions',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customers.every(cus => cus.subscriptions.length > 0)).toBeTruthy();
        expect(res.result.data.customers.length).toEqual(8);
        expect(res.result.data.customers[0].contact).toBeDefined();
        const customer = res.result.data.customers
          .find(cus => UtilsHelper.areObjectIdsEquals(cus._id, customersList[0]._id));
        expect(customer.subscriptions.length).toEqual(5);
        expect(customer.referentHistories.length).toEqual(2);
      });

      it('should get only customers with subscriptions from the company', async () => {
        authToken = await getTokenByCredentials(userList[4].local);
        const res = await app.inject({
          method: 'GET',
          url: '/customers/subscriptions',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customers).toBeDefined();
        const customersFromCompanyCount = await Customer
          .countDocuments({ _id: { $in: res.result.data.customers.map(c => c._id) }, company: otherCompany._id });
        expect(customersFromCompanyCount).toEqual(res.result.data.customers.length);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers/subscriptions',
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers/sectors', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should get only customers with events in sector', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/customers/sectors?sector=${sectorsList[0]._id}&startDate=2019-01-02&endDate=2019-01-31`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customers.length).toEqual(2);
        expect([customersList[0]._id, customersList[1]._id]
          .every(id => res.result.data.customers.find(c => UtilsHelper.areObjectIdsEquals(id, c._id)))).toBeTruthy();
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/sectors?sector=${sectorsList[0]._id}&startDate=2019-01-02&endDate=2019-01-31`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customer/with-intervention', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should get all customers with at least one intervention', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/customers/with-intervention',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customers).toBeDefined();
        expect(res.result.data.customers).toHaveLength(6);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/customers/with-intervention',
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers/{id}', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should return customer', async () => {
        const customerId = customersList[0]._id;
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${customerId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(UtilsHelper.areObjectIdsEquals(res.result.data.customer._id, customerId)).toBeTruthy();
      });

      it('should return a 404 error if customer is not from the same company', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${otherCompanyCustomers[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      it('should return the customer if I am its helper', async () => {
        authToken = await getTokenByCredentials(userList[0].local);
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(200);
      });

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customersList[0]._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /customers/{id}', () => {
    const updatePayload = { identity: { firstname: 'seloger', lastname: 'pap' } };
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should update a customer', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[0]._id}`,
          payload: updatePayload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customer).toEqual(expect.objectContaining({
          identity: expect.objectContaining({
            firstname: updatePayload.identity.firstname,
            lastname: updatePayload.identity.lastname,
          }),
        }));
        const updatedCustomerCount = await Customer
          .countDocuments({ _id: customersList[0]._id, identity: flat(updatePayload.identity) });
        expect(updatedCustomerCount).toEqual(1);
      });

      it('should not create new rum if iban is set for the first time', async () => {
        const customer = customersList[2];
        const ibanPayload = { payment: { iban: 'FR2230066783676514892821545' } };
        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: ibanPayload,
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.payment.mandates).toBeDefined();
        expect(result.result.data.customer.payment.mandates.length).toEqual(1);
      });

      it('should create new rum if iban updated', async () => {
        const customer = customersList[1];
        const ibanPayload = { payment: { iban: 'FR2230066783676514892821545' } };
        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: ibanPayload,
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.payment.mandates).toBeDefined();
        expect(result.result.data.customer.payment.mandates.length).toEqual(2);
        expect(result.result.data.customer.payment.mandates[1].rum).toBeDefined();
      });

      it('should update secondaryAddress', async () => {
        const customer = customersList[0];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: {
            contact: {
              secondaryAddress: {
                fullAddress: '27 rue des renaudes 75017 Paris',
                zipCode: '75017',
                city: 'Paris',
                street: '27 rue des renaudes',
                location: { type: 'Point', coordinates: [2.377133, 48.801389] },
              },
            },
          },
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.contact.secondaryAddress.fullAddress)
          .toBe('27 rue des renaudes 75017 Paris');
      });

      it('should delete secondaryAddress', async () => {
        const customer = customersList[0];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { contact: { secondaryAddress: {} } },
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.contact.secondaryAddress).toEqual({});
      });

      it('should update status and delete customer\'s events and absences', async () => {
        const customer = customersList[0];
        const stoppedDate = CompaniDate().toISO();
        const query = { customer: customer._id, startDate: { $gt: stoppedDate } };
        let eventsAfterStoppedDate = await Event.countDocuments(query);
        let customerAbsencesAfterStoppedDate = await CustomerAbsence.countDocuments(query);
        expect(eventsAfterStoppedDate).not.toEqual(0);
        expect(customerAbsencesAfterStoppedDate).not.toEqual(0);

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { stoppedAt: stoppedDate, stopReason: DEATH },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        eventsAfterStoppedDate = await Event.countDocuments(query);
        customerAbsencesAfterStoppedDate = await CustomerAbsence.countDocuments(query);
        expect(eventsAfterStoppedDate).toBe(0);
        expect(customerAbsencesAfterStoppedDate).toBe(0);
      });

      it('should archive a customer if all interventions are billed', async () => {
        const customer = customersList[9];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { archivedAt: '2022-01-16T14:30:19.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customer.archivedAt).toBeDefined();
      });

      it('should archived customer with non-billed, cancelled but not to invoice interventions', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[15]._id}`,
          payload: { archivedAt: '2021-01-16T14:30:19.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
      });

      it('should return a 400 if there are both archivedAt and stoppedAt in payload', async () => {
        const customer = customersList[0];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { stoppedAt: '2021-01-16T14:30:19.000Z', stopReason: DEATH, archivedAt: '2021-03-16T14:30:19.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 error if missing stopReason when stoppedAt is in payload', async () => {
        const customer = customersList[0];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { stoppedAt: '2021-01-16T14:30:19.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 error if missing stoppedAt when stopReason is in payload', async () => {
        const customer = customersList[0];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { stopReason: DEATH },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return 403 if already stopped', async () => {
        const customer = customersList[9];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { stoppedAt: '2021-01-16T14:30:19.000Z', stopReason: DEATH },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return 403 if user tries to archive a customer before its stopping date', async () => {
        const customer = customersList[13];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { archivedAt: '2020-05-23T23:59:59.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return 403 if stoppedDate before createdAt', async () => {
        const customer = customersList[10];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { stoppedAt: '2021-05-23T23:59:59.000Z', stopReason: DEATH },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return 403 if user tries to archive a customer before stopping it', async () => {
        const customer = customersList[10];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { archivedAt: '2021-05-23T23:59:59.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return 403 if user tries to archive a customer who is already archived', async () => {
        const customer = customersList[11];

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}`,
          payload: { archivedAt: '2022-02-22T23:59:59.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should not archived customer with non-billed and non-cancelled interventions', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[12]._id}`,
          payload: { archivedAt: '2021-01-16T14:30:19.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should not archived customer with non-billed, cancelled but to invoice interventions', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[13]._id}`,
          payload: { archivedAt: '2021-01-16T14:30:19.000Z' },
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should not update a customer if from other company', async () => {
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${otherCompanyCustomers[0]._id}`,
          payload: updatePayload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      it('should update a customer if I am its helper', async () => {
        authToken = await getTokenByCredentials(userList[0].local);
        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { identity: { firstname: 'Volgarr', lastname: 'Theviking' } },
        });

        expect(res.statusCode).toBe(200);
      });

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customersList[0]._id}`,
            payload: updatePayload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /customers/{id}', () => {
    let deleteFileStub;
    beforeEach(() => {
      deleteFileStub = sinon.stub(Drive, 'deleteFile').resolves({ id: '1234567890' });
    });
    afterEach(() => {
      deleteFileStub.restore();
    });

    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should delete a customer without interventions', async () => {
        const customersBefore = await Customer.countDocuments({ company: authCompany._id });
        const customerId = customersList[3]._id;

        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[3]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        sinon.assert.calledWithExactly(deleteFileStub, { fileId: customersList[3].driveFolder.driveId });

        const customersCount = await Customer.countDocuments({ company: authCompany._id });
        expect(customersCount).toBe(customersBefore - 1);
        const helper = await Helper.countDocuments({ customer: customerId });
        expect(helper).toBe(0);
        const referentHistories = await ReferentHistory.countDocuments({ customer: customerId });
        expect(referentHistories).toBe(0);
        const eventHistories = await EventHistory.countDocuments({ 'event.customer': customerId });
        expect(eventHistories).toBe(0);
        const repetitions = await Repetition.countDocuments({ customer: customerId });
        expect(repetitions).toBe(0);
        const customerPartners = await CustomerPartner.countDocuments({ customer: customerId });
        expect(customerPartners).toBe(0);
        const customerAbsences = await CustomerAbsence.countDocuments({ customer: customerId });
        expect(customerAbsences).toBe(0);
      });

      it('should return a 404 error if customer is not from the same company', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${otherCompanyCustomers[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });

      it('should return a 403 error if customer has interventions', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return a 403 error if customer has bills', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[4]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return a 403 error if customer has payments', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[5]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return a 403 error if customer has creditnotes', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[6]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });

      it('should return a 403 error if customer has taxcertificates', async () => {
        const res = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[7]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(403);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customersList[3]._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /customers/{id}/qrcode', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });
      it('should return customer\'s qrcode', async () => {
        const result = await app.inject({
          method: 'GET',
          url: `/customers/${customersList[0]._id}/qrcode`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(200);
      });

      it('should return 404 if customer is not from the same company', async () => {
        const result = await app.inject({
          method: 'GET',
          url: `/customers/${otherCompanyCustomers[0]._id}/qrcode`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      it('should get QR code if I am its helper ', async () => {
        authToken = await getTokenByCredentials(userList[0].local);
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${customersList[0]._id}/qrcode`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
      });

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'auxiliary', expectedCode: 200 },
        { name: 'auxiliary_without_company', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customersList[0]._id}/qrcode`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS SUBSCRIPTIONS ROUTES', () => {
  let authToken;
  beforeEach(populateDB);

  describe('POST /customers/{id}/subscriptions', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should add hourly subscription to customer', async () => {
        const customer = customersList[1];
        const payload = {
          service: serviceIdList[1],
          versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, saturdays: 2, sundays: 1 }],
        };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.subscriptions).toBeDefined();
        expect(result.result.data.customer.subscriptions.some(s =>
          UtilsHelper.areObjectIdsEquals(s.service._id, payload.service) &&
          s.versions[0].unitTTCRate === payload.versions[0].unitTTCRate
        )).toBeTruthy();
      });

      it('should add fixed subscription to customer', async () => {
        const customer = customersList[2];
        const payload = { service: serviceIdList[4], versions: [{ unitTTCRate: 12, weeklyCount: 12 }] };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.subscriptions).toBeDefined();
        expect(result.result.data.customer.subscriptions.some(s =>
          UtilsHelper.areObjectIdsEquals(s.service._id, payload.service) &&
          s.versions[0].unitTTCRate === payload.versions[0].unitTTCRate
        )).toBeTruthy();
      });

      const fixedServiceForbiddenField = ['weeklyHours', 'saturdays', 'sundays', 'evenings'];
      fixedServiceForbiddenField.forEach((field) => {
        it(`should return a 422 if try to create fixed service with ${field}`, async () => {
          const customer = customersList[2];
          const payload = { service: serviceIdList[4], versions: [{ unitTTCRate: 12, weeklyCount: 12, [field]: 3 }] };

          const result = await app.inject({
            method: 'POST',
            url: `/customers/${customer._id}/subscriptions`,
            headers: { Cookie: `alenvi_token=${authToken}` },
            payload,
          });

          expect(result.statusCode).toBe(422);
        });
      });

      it('should return a 400 if try to create service without weeklyCount nor weeklyHours', async () => {
        const customer = customersList[2];
        const payload = { service: serviceIdList[4], versions: [{ unitTTCRate: 12 }] };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(400);
      });

      it('should return a 400 if weeklyCount is not an integer', async () => {
        const customer = customersList[2];
        const payload = { service: serviceIdList[4], versions: [{ unitTTCRate: 12, weeklyCount: 12.4 }] };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(400);
      });

      it('should return a 422 if try to create hourly subscription without weeklyHours', async () => {
        const customer = customersList[1];
        const payload = {
          service: serviceIdList[1],
          versions: [{ unitTTCRate: 12, weeklyCount: 12, evenings: 2, sundays: 1 }],
        };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(422);
      });

      it('should return a 422 if hourly subscription for service with billing items without weeklyCount', async () => {
        const customer = customersList[1];
        const payload = {
          service: serviceIdList[5],
          versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
        };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(422);
      });

      it('should return 403 if service is archived', async () => {
        const customer = customersList[1];
        const payload = {
          service: archivedService,
          versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
        };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(403);
      });

      it('should return 409 if service already subscribed', async () => {
        const customer = customersList[0];
        const payload = {
          service: customer.subscriptions[0].service,
          versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
        };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(409);
      });

      it('should return 404 if customer not from company', async () => {
        const customer = customersList[0];
        const payload = {
          service: customer.subscriptions[0].service,
          versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
        };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${otherCompanyCustomers[0]._id}/subscriptions`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      const payload = {
        service: serviceIdList[1],
        versions: [{ unitTTCRate: 12, weeklyHours: 12, evenings: 2, sundays: 1 }],
      };

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[1]._id}/subscriptions`,
            headers: { Cookie: `alenvi_token=${authToken}` },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /customers/{id}/subscriptions/{subscriptionId}', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should update customer subscription for hourly service', async () => {
        const payload = { weeklyHours: 24, unitTTCRate: 1, evenings: 3, saturdays: 3, sundays: 3 };
        const customer = customersList[0];
        const subscription = customer.subscriptions[0];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.subscriptions).toBeDefined();
        expect(result.result.data.customer.subscriptions[0].versions).toBeDefined();
        expect(result.result.data.customer.subscriptions[0].versions.length)
          .toEqual(subscription.versions.length + 1);
      });

      it('should update customer subscription for fixed service', async () => {
        const payload = { weeklyCount: 24, unitTTCRate: 1 };
        const customer = customersList[1];
        const subscription = customer.subscriptions[1];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.subscriptions).toBeDefined();
        expect(result.result.data.customer.subscriptions[1].versions).toBeDefined();
        expect(result.result.data.customer.subscriptions[1].versions.length)
          .toEqual(subscription.versions.length + 1);
      });

      it('should return a 422 if try to update hourly sub without weeklyHours', async () => {
        const payload = { weeklyCount: 24, unitTTCRate: 1, evenings: 3 };
        const customer = customersList[0];
        const subscription = customer.subscriptions[0];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(422);
      });

      const fixedServiceForbiddenField = ['weeklyHours', 'saturdays', 'sundays', 'evenings'];
      fixedServiceForbiddenField.forEach((field) => {
        it(`should return a 422 if try to create fixed service with ${field}`, async () => {
          const payload = { unitTTCRate: 12, weeklyCount: 12, [field]: 3 };
          const customer = customersList[1];
          const subscription = customer.subscriptions[1];

          const result = await app.inject({
            method: 'PUT',
            url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
            payload,
          });

          expect(result.statusCode).toBe(422);
        });
      });

      it('should return a 422 if hourly subscription for service with billing items without weeklyCount', async () => {
        const customer = customersList[0];
        const subscription = customer.subscriptions[4];
        const payload = { weeklyHours: 24, unitTTCRate: 1, evenings: 3 };

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(422);
      });

      it('should return a 400 if try to update sub without weeklyCount nor weeklyHours', async () => {
        const payload = { unitTTCRate: 1 };
        const customer = customersList[1];
        const subscription = customer.subscriptions[1];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(400);
      });

      it('should return a 400 if weeklyCount is not an integer', async () => {
        const payload = { unitTTCRate: 1, weeklyCount: 12.4 };
        const customer = customersList[1];
        const subscription = customer.subscriptions[1];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(400);
      });

      it('should return a 403 if service is archived', async () => {
        const payload = { weeklyHours: 24, unitTTCRate: 1, evenings: 3 };
        const customer = customersList[1];
        const subscription = customer.subscriptions[0];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(403);
      });

      it('should return 404 as subscription not found', async () => {
        const payload = { weeklyHours: 24, unitTTCRate: 1, evenings: 3 };
        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[0]._id}/subscriptions/${new ObjectId()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(404);
      });

      it('should return 404 if customer not from company', async () => {
        const payload = { weeklyHours: 24, unitTTCRate: 1, evenings: 3 };
        const subscriptionId = otherCompanyCustomers[0].subscriptions[0]._id;
        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${otherCompanyCustomers[0]._id}/subscriptions/${subscriptionId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      const payload = { weeklyHours: 24, unitTTCRate: 1, evenings: 3 };
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /customers/{id}/subscriptions/{subscriptionId}', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should delete customer subscription', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}/subscriptions/${customersList[0].subscriptions[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(200);
      });

      it('should not delete customer subscription if customer not from same company', async () => {
        const customer = otherCompanyCustomers[1];
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customer._id}/subscriptions/${customer.subscriptions[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(404);
      });

      it('should not delete customer subscription if events linked', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}/subscriptions/${customersList[0].subscriptions[3]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(403);
      });

      it('should not delete customer if repetition linked', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}/subscriptions/${customersList[0].subscriptions[2]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(403);
      });

      it('should not delete customer if funding linked', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}/subscriptions/${customersList[0].subscriptions[1]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(403);
      });
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const subscription = customer.subscriptions[0];
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customer._id}/subscriptions/${subscription._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS MANDATES ROUTES', () => {
  let authToken;
  beforeEach(populateDB);

  describe('GET /customers/{_id}/mandates', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should return customer mandates', async () => {
        const result = await app.inject({
          method: 'GET',
          url: `/customers/${customersList[1]._id}/mandates`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(200);
        expect(result.result.data.customer.payment.mandates).toBeDefined();
        expect(result.result.data.customer.payment.mandates.length).toEqual(customersList[1].payment.mandates.length);
      });

      it('should return 404 if customer is from other company', async () => {
        const result = await app.inject({
          method: 'GET',
          url: `/customers/${otherCompanyCustomers[0]._id}/mandates`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customersList[1]._id}/mandates`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT /customers/{_id}/mandates/{mandateId}', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should update customer mandate', async () => {
        const payload = { signedAt: '2019-09-09T00:00:00.000Z' };

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[1]._id}/mandates/${customersList[1].payment.mandates[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toEqual(200);
        expect(result.result.data.customer.payment.mandates).toBeDefined();
        expect(result.result.data.customer.payment.mandates[0].signedAt).toBeDefined();
      });

      it('should return 404 if mandate not found', async () => {
        const payload = { signedAt: '2019-09-09T00:00:00.000Z' };

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[1]._id}/mandates/${new ObjectId()}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toEqual(404);
      });

      it('should return 404 if user not from same company', async () => {
        const payload = { signedAt: '2019-09-09T00:00:00.000Z' };
        const customer = otherCompanyCustomers[0];

        const result = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/mandates/${customer.payment.mandates[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toEqual(404);
      });
    });

    describe('Other roles', () => {
      const payload = { signedAt: '2019-01-18T10:00:00.000Z' };

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customersList[1]._id}/mandates/${customersList[1].payment.mandates[0]._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
            payload,
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS QUOTES ROUTES', () => {
  let authToken;
  beforeEach(populateDB);

  describe('GET customers/:id/quotes', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should return customer quotes', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${customersList[0]._id}/quotes`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customer).toBeDefined();
        expect(res.result.data.customer.quotes).toBeDefined();
        expect(res.result.data.customer.quotes.length).toEqual(customersList[0].quotes.length);
        expect(res.result.data.customer.quotes[0]._id).toEqual(customersList[0].quotes[0]._id);
        expect(res.result.data.customer._id).toEqual(customersList[0]._id);
      });

      it('should return 404 error if user is from other company', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/customers/${otherCompanyCustomers[0]._id}/quotes`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: `/customers/${customersList[0]._id}/quotes`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('POST customers/:id/quotes', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should create a customer quote', async () => {
        const payload = {
          subscriptions: [
            {
              service: { name: 'TestTest', nature: 'hourly' },
              unitTTCRate: 23,
              weeklyHours: 3,
              weeklyCount: 1,
              saturdays: 1,
              sundays: 3,
              billingItemsTTCRate: 25,
              serviceBillingItems: ['Masques de protection'],
            },
            { service: { name: 'TestTest2', nature: 'hourly' }, unitTTCRate: 30, weeklyHours: 10 },
          ],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[1]._id}/quotes`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customer).toBeDefined();
        expect(res.result.data.customer.quotes).toBeDefined();
        expect(res.result.data.customer._id).toEqual(customersList[1]._id);
        expect(res.result.data.customer.quotes[0].quoteNumber).toEqual(`DEV-101${moment().format('MMYY')}00001`);
        expect(res.result.data.customer.quotes[0].subscriptions).toEqual(expect.arrayContaining([
          expect.objectContaining(payload.subscriptions[0]),
          expect.objectContaining(payload.subscriptions[1]),
        ]));
      });

      it('should return a 400 if weeklyCount is not an integer', async () => {
        const payload = { service: { name: 'Ménage', nature: 'fixed' }, unitTTCRate: 30, weeklyCount: 4.6 };

        const result = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[1]._id}/quotes`,
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload,
        });

        expect(result.statusCode).toBe(400);
      });

      it('should return a 400 error if \'subscriptions\' array is missing from payload', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[1]._id}/quotes`,
          payload: {},
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 error if \'service\' is missing from subscriptions in payload', async () => {
        const payload = { subscriptions: [{ unitTTCRate: 23, weeklyHours: 3 }] };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[1]._id}/quotes`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      const service = { name: 'TestTest', nature: 'hourly' };
      const params = ['nature', 'name'];
      params.forEach((param) => {
        it(`should return a 400 error if ${param} is missing from subscriptions in payload`, async () => {
          const payload = {
            subscriptions: [{ service: { ...omit(service, param) }, unitTTCRate: 23, weeklyHours: 3 }],
          };

          const res = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[1]._id}/quotes`,
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(res.statusCode).toBe(400);
        });
      });

      it('should not create a customer quote if from other company', async () => {
        const payload = {
          subscriptions: [
            { service: { name: 'TestTest', nature: 'hourly' }, unitTTCRate: 23, weeklyHours: 3 },
            { service: { name: 'TestTest2', nature: 'hourly' }, unitTTCRate: 30, weeklyHours: 10 },
          ],
        };
        const res = await app.inject({
          method: 'POST',
          url: `/customers/${otherCompanyCustomers[0]._id}/quotes`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      const payload = {
        subscriptions: [
          { service: { name: 'TestTest', nature: 'hourly' }, unitTTCRate: 23, weeklyHours: 3 },
          { service: { name: 'TestTest2', nature: 'hourly' }, unitTTCRate: 30, weeklyHours: 10 },
        ],
      };

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[1]._id}/quotes`,
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS FUNDINGS ROUTES', () => {
  let authToken;
  beforeEach(populateDB);

  describe('POST customers/:id/fundings', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should create a customer funding', async () => {
        const customer = customersList[0];
        const payload = {
          nature: FIXED,
          thirdPartyPayer: customerThirdPartyPayers[0]._id,
          subscription: customer.subscriptions[1]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            endDate: '2021-03-01T23:59:59.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customer.fundings.length).toEqual(3);
      });

      it('should return a 409 error if subscription is used by another funding', async () => {
        const customer = customersList[0];
        const payload = {
          nature: FIXED,
          thirdPartyPayer: customerThirdPartyPayers[0]._id,
          subscription: customer.subscriptions[1]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(409);
      });

      it('should return a 400 error if \'subscriptions\' is missing from payload', async () => {
        const payload = {
          nature: FIXED,
          thirdPartyPayer: customerThirdPartyPayers[0]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            endDate: '2021-03-01T23:59:59.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[0]._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 error if \'endDate\' is before \'startDate\'', async () => {
        const payload = {
          nature: FIXED,
          subscription: customersList[0].subscriptions[0]._id,
          thirdPartyPayer: customerThirdPartyPayers[0]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            endDate: '2020-03-01T23:59:59.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[0]._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 error if \'thirdPartyPayer\' is missing from payload', async () => {
        const payload = {
          nature: FIXED,
          subscription: customersList[0].subscriptions[0]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            endDate: '2021-03-01T23:59:59.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[0]._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 404 error if customer is not from the same company', async () => {
        const payload = {
          subscription: customersList[0].subscriptions[0]._id,
          nature: FIXED,
          thirdPartyPayer: customerThirdPartyPayers[0]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            endDate: '2021-03-01T23:59:59.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${otherCompanyCustomers[0]._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });

      it(
        'should return a 400 error if fundingPlanId is missing for thirdPartyPayer with teletransmissionId',
        async () => {
          const payload = {
            subscription: customersList[0].subscriptions[0]._id,
            nature: FIXED,
            thirdPartyPayer: customerThirdPartyPayers[1]._id,
            frequency: MONTHLY,
            versions: [{
              folderNumber: 'D123456',
              startDate: '2021-01-01T00:00:00.000Z',
              endDate: '2021-03-01T23:59:59.000Z',
              amountTTC: 120,
              customerParticipationRate: 10,
              careDays: [2, 5],
            }],
          };

          const res = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[0]._id}/fundings`,
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(res.statusCode).toBe(400);
        }
      );

      it('should return a 400 if fundingPlanId is not a string', async () => {
        const payload = {
          subscription: customersList[0].subscriptions[0]._id,
          nature: FIXED,
          thirdPartyPayer: customerThirdPartyPayers[1]._id,
          frequency: MONTHLY,
          versions: [{
            folderNumber: 'D123456',
            startDate: '2021-01-01T00:00:00.000Z',
            endDate: '2021-03-01T23:59:59.000Z',
            amountTTC: 120,
            customerParticipationRate: 10,
            careDays: [2, 5],
            fundingPlanId: 12345,
          }],
        };

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[0]._id}/fundings`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });
    });

    describe('Other roles', () => {
      const customer = customersList[0];
      const payload = {
        nature: FIXED,
        thirdPartyPayer: customerThirdPartyPayers[0]._id,
        subscription: customer.subscriptions[1]._id,
        frequency: MONTHLY,
        versions: [{
          folderNumber: 'D123456',
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '2021-03-01T23:59:59.000Z',
          amountTTC: 120,
          customerParticipationRate: 10,
          careDays: [2, 5],
        }],
      };
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customer._id}/fundings`,
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('PUT customers/:id/fundings', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should update a customer funding', async () => {
        const customer = customersList[0];
        const payload = {
          subscription: customer.subscriptions[0]._id,
          amountTTC: 90,
          customerParticipationRate: 20,
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '',
          careDays: [1, 3],
          fundingPlanId: '12345',
        };

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customer._id}/fundings/${customer.fundings[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(200);
        expect(res.result.data.customer).toBeDefined();
        expect(res.result.data.customer.fundings[0]).toBeDefined();
        expect(res.result.data.customer._id).toEqual(customer._id);
        expect(res.result.data.customer.fundings[0].versions.length).toBe(2);
        expect(res.result.data.customer.fundings[0].versions[1].endDate).toBeNull();
      });

      it('should return 400 if endDate is before startDate', async () => {
        const payload = {
          subscription: customersList[0].subscriptions[0]._id,
          amountTTC: 90,
          customerParticipationRate: 20,
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '2020-03-01T23:59:59.000Z',
          careDays: [1, 3],
        };

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 if fundingPlanId is empty and tpp has teletransmissionId', async () => {
        const payload = {
          subscription: customersList[0].subscriptions[0]._id,
          amountTTC: 90,
          customerParticipationRate: 20,
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '2021-03-01T23:59:59.000Z',
          careDays: [1, 3],
          fundingPlanId: '',
        };

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 400 if fundingPlanId is not a string', async () => {
        const payload = {
          subscription: customersList[0].subscriptions[0]._id,
          amountTTC: 90,
          customerParticipationRate: 20,
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '2021-03-01T23:59:59.000Z',
          careDays: [1, 3],
          fundingPlanId: 12345,
        };

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(400);
      });

      it('should return a 404 error if customer is not from the same company', async () => {
        const payload = {
          subscription: otherCompanyCustomers[0].subscriptions[0]._id,
          amountTTC: 90,
          customerParticipationRate: 20,
          startDate: '2021-01-01T00:00:00.000Z',
          endDate: '2021-03-01T23:59:59.000Z',
          careDays: [1, 3],
        };

        const res = await app.inject({
          method: 'PUT',
          url: `/customers/${otherCompanyCustomers[0]._id}/fundings/${otherCompanyCustomers[0].fundings[0]._id}`,
          payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(res.statusCode).toBe(404);
      });
    });

    describe('Other roles', () => {
      const payload = {
        subscription: customersList[0].subscriptions[0]._id,
        amountTTC: 90,
        customerParticipationRate: 20,
        startDate: '2021-01-01T00:00:00.000Z',
        endDate: '2021-03-01T23:59:59.000Z',
        careDays: [1, 3],
      };

      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'PUT',
            url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[0]._id}`,
            payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('DELETE /customers/{id}/fundings/{fundingId}', () => {
    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should delete customer funding', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(200);
      });

      it('should return 404 if customer is not from same company', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${otherCompanyCustomers[0]._id}/fundings/${otherCompanyCustomers[0].fundings[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(404);
      });

      it('should return 403 if customer funding is used in bill', async () => {
        const result = await app.inject({
          method: 'DELETE',
          url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[1]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(result.statusCode).toBe(403);
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
      ];

      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'DELETE',
            url: `/customers/${customersList[0]._id}/fundings/${customersList[0].fundings[0]._id}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

describe('CUSTOMERS FILE UPLOAD ROUTES', () => {
  let authToken;
  beforeEach(populateDB);

  describe('POST /customers/:_id/gdrive/:driveId/upload', () => {
    const fakeDriveId = 'fakeDriveId';
    let addStub;
    let getFileByIdStub;

    beforeEach(() => {
      addStub = sinon.stub(Drive, 'add');
      getFileByIdStub = sinon.stub(Drive, 'getFileById');
    });

    afterEach(() => {
      addStub.restore();
      getFileByIdStub.restore();
    });

    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it('should upload a signed mandate', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const payload = {
          fileName: 'mandat_signe',
          file: 'test',
          type: 'signedMandate',
          mandateId: customersList[1].payment.mandates[0]._id.toHexString(),
        };
        const form = generateFormData(payload);

        const response = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[1]._id}/gdrive/${fakeDriveId}/upload`,
          payload: getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toEqual(200);
        sinon.assert.calledOnce(addStub);
        sinon.assert.calledOnce(getFileByIdStub);
      });

      it('should not upload a signed document if customer is not from the same company', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const payload = {
          fileName: 'mandat_signe',
          file: 'test',
          type: 'signedMandate',
          mandateId: otherCompanyCustomers[0].payment.mandates[0]._id.toHexString(),
        };
        const form = generateFormData(payload);

        const response = await app.inject({
          method: 'POST',
          url: `/customers/${otherCompanyCustomers[0]._id}/gdrive/${fakeDriveId}/upload`,
          payload: getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toEqual(404);
      });

      it('should upload a signed quote', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const customer = customersList[0];
        const payload = {
          fileName: 'devis_signe',
          file: 'test',
          type: 'signedQuote',
          quoteId: customer.quotes[0]._id.toHexString(),
        };
        const form = generateFormData(payload);

        const response = await app.inject({
          method: 'POST',
          url: `/customers/${customer._id}/gdrive/${fakeDriveId}/upload`,
          payload: getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toEqual(200);
        sinon.assert.calledOnce(addStub);
        sinon.assert.calledOnce(getFileByIdStub);
      });

      it('should upload a financial certificate', async () => {
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

        const payload = {
          file: 'test',
          type: 'financialCertificates',
          fileName: 'financialCertificate',
        };
        const form = generateFormData(payload);

        const response = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[0]._id}/gdrive/${fakeDriveId}/upload`,
          payload: getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toEqual(200);
        sinon.assert.calledOnce(addStub);
        sinon.assert.calledOnce(getFileByIdStub);
      });
    });

    describe('Other roles', () => {
      it('should upload a financial certificate if I am its helper', async () => {
        const payload = {
          fileName: 'financialCertificate',
          file: 'test',
          type: 'financialCertificates',
        };
        addStub.returns({ id: 'fakeFileDriveId' });
        getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });
        authToken = await getTokenByCredentials(userList[0].local);
        const form = generateFormData(payload);

        const res = await app.inject({
          method: 'POST',
          url: `/customers/${customersList[0]._id}/gdrive/${fakeDriveId}/upload`,
          payload: getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });
        expect(res.statusCode).toBe(200);
        sinon.assert.calledOnce(addStub);
        sinon.assert.calledOnce(getFileByIdStub);
      });

      const roles = [
        { name: 'vendor_admin', expectedCode: 403, callCount: 0 },
        { name: 'helper', expectedCode: 403, callCount: 0 },
        { name: 'planning_referent', expectedCode: 403, callCount: 0 },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
          const payload = {
            fileName: 'financialCertificate',
            file: 'test',
            type: 'financialCertificates',
          };
          addStub.returns({ id: 'fakeFileDriveId' });
          getFileByIdStub.returns({ webViewLink: 'fakeWebViewLink' });

          const form = generateFormData(payload);
          authToken = await getToken(role.name);
          const response = await app.inject({
            method: 'POST',
            url: `/customers/${customersList[0]._id}/gdrive/${fakeDriveId}/upload`,
            payload: getStream(form),
            headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
          sinon.assert.callCount(addStub, role.callCount);
          sinon.assert.callCount(getFileByIdStub, role.callCount);
        });
      });
    });
  });
});
