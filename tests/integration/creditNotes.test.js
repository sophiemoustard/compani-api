const { ObjectID } = require('mongodb');
const expect = require('expect');
const app = require('../../server');
const CreditNote = require('../../src/models/CreditNote');
const { populateDB, creditNotesList, creditNoteCustomer, creditNoteEvent, creditNoteUserList } = require('./seed/creditNotesSeed');
const { FIXED } = require('../../src/helpers/constants');
const { getToken, getTokenByCredentials } = require('./seed/authentificationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CREDIT NOTES ROUTES - POST /creditNotes', () => {
  let authToken = null;
  beforeEach(populateDB);

  const payload = {
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
    subscription: {
      _id: new ObjectID(),
      service: {
        serviceId: new ObjectID(),
        nature: FIXED,
        name: 'toto',
      },
      vat: 5.5,
    },
  };

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should create two new credit note', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payload, exclTaxesTpp: 100, inclTaxesTpp: 100, thirdPartyPayer: new ObjectID() },
      });

      expect(response.statusCode).toBe(200);
      const creditNotes = await CreditNote.find();
      expect(creditNotes.filter(cn => cn.linkedCreditNote)).toBeDefined();
      expect(creditNotes.filter(cn => cn.linkedCreditNote).length).toEqual(2);
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 2);
    });

    it('should create one credit note', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payload },
      });

      expect(response.statusCode).toBe(200);
      const creditNotes = await CreditNote.find();
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 1);
    });

    const missingParams = [
      {
        paramName: 'date',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'customer',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'events.eventId',
        payload: { ...payload },
        update() {
          delete this.payload.events[0].eventId;
        },
      },
      {
        paramName: 'events.auxiliary',
        payload: { ...payload },
        update() {
          delete this.payload.events[0].auxiliary;
        },
      },
      {
        paramName: 'events.serviceName',
        payload: { ...payload },
        update() {
          delete this.payload.events[0].serviceName;
        },
      },
      {
        paramName: 'events.startDate',
        payload: { ...payload },
        update() {
          delete this.payload.events[0].startDate;
        },
      },
      {
        paramName: 'events.endDate',
        payload: { ...payload },
        update() {
          delete this.payload.events[0].endDate;
        },
      },
      {
        paramName: 'events.bills',
        payload: { ...payload },
        update() {
          delete this.payload.events[0].bills;
        },
      },
      {
        paramName: 'subscription.service',
        payload: { ...payload },
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
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: '/creditNotes',
          headers: { 'x-access-token': authToken },
          payload: { ...payload },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - GET /creditNotes', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should get all credit notes', async () => {
      const creditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes.length).toEqual(creditNotesNumber);
    });
  });

  describe('Other roles', () => {
    it('should return customer creditnotes if I am its helper', async () => {
      const helper = creditNoteUserList[0];
      const helperToken = await getTokenByCredentials(helper.local);
      const res = await app.inject({
        method: 'GET',
        url: `/creditNotes?customer=${helper.customers[0]}`,
        headers: { 'x-access-token': helperToken },
      });
      expect(res.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
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

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
    });

    it('should get credit note pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
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

  const payload = {
    date: '2019-07-19T14:00:18',
    startDate: '2019-07-01T00:00:00',
    endDate: '2019-07-31T23:59:59',
    exclTaxesCustomer: 200,
    inclTaxesCustomer: 224,
  };

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
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
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
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

  describe('Admin', () => {
    beforeEach(async () => {
      authToken = await getToken('admin');
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
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
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
