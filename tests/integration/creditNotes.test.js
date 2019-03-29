const { ObjectID } = require('mongodb');
const expect = require('expect');
const moment = require('moment');
const qs = require('qs');

const app = require('../../server');
const CreditNote = require('../../models/CreditNote');
const { getToken } = require('./seed/usersSeed');
const { populateCreditNotes, creditNotesList } = require('./seed/creditNotesSeed');
const { populateEvents } = require('./seed/eventsSeed');
const { populateCustomers, customersList } = require('./seed/customersSeed');
const { populateServices, servicesList } = require('./seed/servicesSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CREDIT NOTES ROUTES', () => {
  let authToken = null;
  before(populateCustomers);
  before(populateEvents);
  before(populateServices);
  beforeEach(populateCreditNotes);
  beforeEach(async () => {
    authToken = await getToken();
  });

  describe('POST /creditNotes', () => {
    const payload = {
      date: moment().toDate(),
      startDate: moment().startOf('month').toDate(),
      endDate: moment().set('date', 15).toDate(),
      customer: customersList[0]._id,
      exclTaxes: 100,
      inclTaxes: 112,
      subscription: {
        service: servicesList[0].versions[0].name,
        vat: servicesList[0].versions[0].vat
      },
    };
    it('should create a new credit note', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { 'x-access-token': authToken },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNote.number).toBeDefined();
      const creditNotes = await CreditNote.find();
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 1);
    });
    const missingParams = [
      {
        paramName: 'customer',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
      },
      {
        paramName: 'exclTaxes',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
      },
      {
        paramName: 'inclTaxes',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
      },
      {
        paramName: 'date',
        payload: { ...payload },
        update() {
          delete this.payload[this.paramName];
        }
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
      const queries = {
        startDate: moment().subtract(1, 'd').toDate(),
        endDate: moment().add(1, 'd').toDate(),
      };

      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes?${qs.stringify(queries)}`,
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
      exclTaxes: 200,
      inclTaxes: 224,
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
