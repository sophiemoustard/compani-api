const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');

const app = require('../../server');
const CreditNote = require('../../models/CreditNote');
const { populateDB, creditNotesList, creditNoteCustomer, creditNoteEvent } = require('./seed/creditNotesSeed');
const { FIXED } = require('../../helpers/constants');
const { getToken } = require('./seed/authentificationSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CREDIT NOTES ROUTES', () => {
  let authToken = null;
  beforeEach(populateDB);
  beforeEach(async () => {
    authToken = await getToken('admin');
  });

  describe('POST /creditNotes', () => {
    const payload = {
      date: moment().toDate(),
      startDate: moment().startOf('month').toDate(),
      endDate: moment().set('date', 15).toDate(),
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

    it('should create two new credit note', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payload, exclTaxesTpp: 100, inclTaxesTpp: 100, thirdPartyPayer: new ObjectID() },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes.length).toEqual(2);
      const creditNotes = await CreditNote.find();
      expect(creditNotes.filter(cn => cn.linkedCreditNote)).toBeDefined();
      expect(creditNotes.filter(cn => cn.linkedCreditNote).length).toEqual(2);
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 2);
    });

    it('should create two new credit note', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload: { ...payload },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes[0].number).toBeDefined();
      const creditNotes = await CreditNote.find();
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 1);
    });

    const missingParams = [
      {
        paramName: 'customer',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'exclTaxesCustomer',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'inclTaxesCustomer',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
      {
        paramName: 'date',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        },
      },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if '${test.paramName}' params is missing`, async () => {
        test.update();
        const response = await app.inject({
          method: 'POST',
          url: '/thirdpartypayers',
          headers: { 'x-access-token': authToken },
          payload: test.payload,
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('GET /creditNotes', () => {
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

  describe('PUT /creditNotes/:id', () => {
    const payload = {
      date: moment().add(1, 'd').toDate(),
      startDate: moment().startOf('month').toDate(),
      endDate: moment().endOf('month').toDate(),
      exclTaxesCustomer: 200,
      inclTaxesCustomer: 224,
    };

    it('should update a credit note', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/creditNotes/${creditNotesList[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNote).toMatchObject(payload);
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

  describe('DELETE /creditNotes/:id', () => {
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
});
