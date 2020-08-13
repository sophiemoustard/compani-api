const { ObjectID } = require('mongodb');
const expect = require('expect');
const app = require('../../server');
const CreditNote = require('../../src/models/CreditNote');
const {
  populateDB,
  creditNotesList,
  creditNoteCustomer,
  creditNoteEvent,
  creditNoteUserList,
  creditNoteThirdPartyPayer,
  otherCompanyCustomer,
  otherCompanyThirdPartyPayer,
  otherCompanyEvent,
  otherCompanyUser,
  otherCompanyCreditNote,
} = require('./seed/creditNotesSeed');
const { FIXED } = require('../../src/helpers/constants');
const { getToken, getTokenByCredentials, authCompany } = require('./seed/authenticationSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CREDIT NOTES ROUTES - POST /creditNotes', () => {
  let authToken = null;
  beforeEach(populateDB);

  const payloadWithEvents = {
    date: '2019-07-19T14:00:18',
    startDate: '2019-07-01T00:00:00',
    endDate: '2019-07-15T00:00:00',
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: 100,
    inclTaxesCustomer: 112,
    events: [{
      eventId: creditNoteEvent._id,
      auxiliary: creditNoteEvent.auxiliary,
      startDate: creditNoteEvent.startDate,
      endDate: creditNoteEvent.endDate,
      serviceName: 'toto',
      bills: {
        inclTaxesCustomer: 10,
        exclTaxesCustomer: 8,
      },
    }],
  };

  const payloadWithSubscription = {
    date: '2019-07-19T14:00:18',
    startDate: '2019-07-01T00:00:00',
    endDate: '2019-07-15T00:00:00',
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: 100,
    inclTaxesCustomer: 112,
    subscription: {
      _id: creditNoteCustomer.subscriptions[0]._id,
      service: {
        serviceId: new ObjectID(),
        nature: FIXED,
        name: 'toto',
      },
      vat: 5.5,
    },
  };

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should create two new credit notes with linked events', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: {
          ...payloadWithEvents,
          exclTaxesTpp: 100,
          inclTaxesTpp: 100,
          thirdPartyPayer: creditNoteThirdPartyPayer._id,
        },
      });

      expect(response.statusCode).toBe(200);
      const creditNotes = await CreditNote.find({ company: authCompany }).lean();
      const cnWithlinkedCreditNotes = creditNotes.filter(cn => cn.linkedCreditNote);
      expect(cnWithlinkedCreditNotes).toBeDefined();
      expect(cnWithlinkedCreditNotes.length).toEqual(2);
      expect(cnWithlinkedCreditNotes).toEqual(expect.arrayContaining([
        expect.objectContaining({ number: 'AV-101071900001' }),
        expect.objectContaining({ number: 'AV-101071900002' }),
      ]));
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 2);
    });

    it('should create two new credit notes with subscription', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: {
          ...payloadWithSubscription,
          exclTaxesTpp: 100,
          inclTaxesTpp: 100,
          thirdPartyPayer: creditNoteThirdPartyPayer._id,
        },
      });

      expect(response.statusCode).toBe(200);
      const creditNotes = await CreditNote.find({ company: authCompany }).lean();
      const cnWithlinkedCreditNotes = creditNotes.filter(cn => cn.linkedCreditNote);
      expect(cnWithlinkedCreditNotes).toBeDefined();
      expect(cnWithlinkedCreditNotes.length).toEqual(2);
      expect(cnWithlinkedCreditNotes).toEqual(expect.arrayContaining([
        expect.objectContaining({ number: 'AV-101071900001' }),
        expect.objectContaining({ number: 'AV-101071900002' }),
      ]));
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 2);
    });

    it('should create one credit note with linked events', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payloadWithEvents },
      });

      expect(response.statusCode).toBe(200);
      const creditNotes = await CreditNote.find({ company: authCompany._id }).lean();
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 1);
    });

    it('should create one credit note with subscription', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payloadWithEvents },
      });

      expect(response.statusCode).toBe(200);
      const creditNotes = await CreditNote.find({ company: authCompany._id }).lean();
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 1);
    });

    it('should return a 403 error if customer is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payloadWithEvents, customer: otherCompanyCustomer._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if customer subscription is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: {
          ...payloadWithSubscription,
          subscription: {
            _id: otherCompanyCustomer.subscriptions[0]._id,
            service: {
              serviceId: new ObjectID(),
              nature: FIXED,
              name: 'titi',
            },
            vat: 5.5,
          },
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if third party payer is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: {
          ...payloadWithSubscription,
          exclTaxesTpp: 100,
          inclTaxesTpp: 100,
          thirdPartyPayer: otherCompanyThirdPartyPayer._id,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if at least one event is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: {
          ...payloadWithEvents,
          events: [{
            eventId: creditNoteEvent._id,
            auxiliary: creditNoteEvent.auxiliary,
            startDate: creditNoteEvent.startDate,
            endDate: creditNoteEvent.endDate,
            serviceName: 'toto',
            bills: {
              inclTaxesCustomer: 10,
              exclTaxesCustomer: 8,
            },
          }, {
            eventId: otherCompanyEvent._id,
            auxiliary: new ObjectID(),
            startDate: otherCompanyEvent.startDate,
            endDate: otherCompanyEvent.endDate,
            serviceName: 'tata',
            bills: {
              inclTaxesCustomer: 10,
              exclTaxesCustomer: 8,
            },
          }],
        },
      });

      expect(response.statusCode).toBe(403);
    });

    const missingParams = [
      {
        paramName: 'date',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'customer',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'events.eventId',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload.events[0].eventId;
        },
      },
      {
        paramName: 'events.auxiliary',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload.events[0].auxiliary;
        },
      },
      {
        paramName: 'events.serviceName',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload.events[0].serviceName;
        },
      },
      {
        paramName: 'events.startDate',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload.events[0].startDate;
        },
      },
      {
        paramName: 'events.endDate',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload.events[0].endDate;
        },
      },
      {
        paramName: 'events.bills',
        payload: { ...payloadWithEvents },
        update() {
          delete this.payload.events[0].bills;
        },
      },
      {
        paramName: 'subscription.service',
        payload: { ...payloadWithSubscription },
        update() {
          delete this.payload.subscription.service;
        },
      },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if '${test.paramName}' params is missing`, async () => {
        test.update();
        const response = await app.inject({
          method: 'POST',
          url: '/creditNotes',
          headers: { 'x-access-token': authToken },
          payload: test.payload,
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403, erp: true },
      { name: 'auxiliary', expectedCode: 403, erp: true },
      { name: 'auxiliary_without_company', expectedCode: 403, erp: true },
      { name: 'coach', expectedCode: 403, erp: true },
      { name: 'client_admin', expectedCode: 403, erp: false },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/creditNotes',
          headers: { 'x-access-token': authToken },
          payload: { ...payloadWithEvents },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - GET /creditNotes', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get all credit notes (company A)', async () => {
      const creditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes.length).toEqual(creditNotesNumber);
    });

    it('should get all credit notes (company B)', async () => {
      authToken = await getTokenByCredentials(otherCompanyUser.local);

      const response = await app.inject({
        method: 'GET',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes.length).toEqual(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/creditNotes',
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - GET /creditNotes/pdfs', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should get credit note pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should get credit note pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if customer is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes/${otherCompanyCreditNote._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return customer creditnotes pdfs if I am its helper', async () => {
      const helper = creditNoteUserList[0];
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 200 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - PUT /creditNotes/:id', () => {
  let authToken = null;
  beforeEach(populateDB);

  let payload = {
    date: '2019-07-19T14:00:18',
    startDate: '2019-07-01T00:00:00',
    endDate: '2019-07-31T23:59:59',
    exclTaxesCustomer: 200,
    inclTaxesCustomer: 224,
  };

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should update a credit note', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNote.inclTaxesCustomer).toEqual(payload.inclTaxesCustomer);
      expect(response.result.data.creditNote.exclTaxesCustomer).toEqual(payload.exclTaxesCustomer);
    });

    it('should return a 404 error if credit note does not exist', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if credit not origin is not Compani', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[1]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if customer is not from same company', async () => {
      payload = { customer: otherCompanyCustomer._id };

      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if third party payer is not from same company', async () => {
      payload = { exclTaxesTpp: 100, inclTaxesTpp: 100, thirdPartyPayer: otherCompanyThirdPartyPayer._id };

      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if at least one event is not from same company', async () => {
      payload = {
        events: [{
          eventId: otherCompanyEvent._id,
          auxiliary: new ObjectID(),
          startDate: otherCompanyEvent.startDate,
          endDate: otherCompanyEvent.endDate,
          serviceName: 'tata',
          bills: {
            inclTaxesCustomer: 10,
            exclTaxesCustomer: 8,
          },
        }],
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if customer subscription is not from same company', async () => {
      payload = {
        customer: creditNoteCustomer._id,
        subscription: {
          _id: otherCompanyCustomer.subscriptions[0]._id,
          service: {
            serviceId: new ObjectID(),
            nature: FIXED,
            name: 'titi',
          },
          vat: 5.5,
        },
      };
      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if credit note is not editable', async () => {
      payload = {
        date: '2019-07-19T14:00:18',
        startDate: '2019-07-01T00:00:00',
        endDate: '2019-07-31T23:59:59',
        exclTaxesCustomer: 200,
        inclTaxesCustomer: 224,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[2]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
          payload,
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - DELETE /creditNotes/:id', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete a credit note', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if credit does not exist', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${new ObjectID().toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 error if user is not from credit note company', async () => {
      authToken = await getTokenByCredentials(otherCompanyUser.local);

      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if credit note origin is not COMPANI', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[1]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if credit note is not editable', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[2]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
