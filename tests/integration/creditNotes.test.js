const { ObjectId } = require('mongodb');
const expect = require('expect');
const omit = require('lodash/omit');
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
  billingItemList,
  archivedCustomer,
} = require('./seed/creditNotesSeed');
const { FIXED } = require('../../src/helpers/constants');
const { getToken, getTokenByCredentials } = require('./helpers/authentication');
const { authCompany } = require('../seed/authCompaniesSeed');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CREDIT NOTES ROUTES - POST /creditNotes', () => {
  let authToken;
  beforeEach(populateDB);

  const payloadWithEvents = {
    date: '2019-07-19T14:00:18',
    startDate: '2019-07-01T00:00:00',
    endDate: '2019-07-15T00:00:00',
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: '100',
    inclTaxesCustomer: 112,
    events: [{
      eventId: creditNoteEvent._id,
      auxiliary: creditNoteEvent.auxiliary,
      startDate: creditNoteEvent.startDate,
      endDate: creditNoteEvent.endDate,
      serviceName: 'toto',
      bills: {
        inclTaxesCustomer: '10',
        exclTaxesCustomer: '8',
        billingItems: [{ billingItem: billingItemList[0]._id, exclTaxes: '12', inclTaxes: 14 }],
      },
    }],
    misc: 'Je suis un motif',
  };

  const payloadWithSubscription = {
    date: '2019-07-19T14:00:18',
    startDate: '2019-07-01T00:00:00',
    endDate: '2019-07-15T00:00:00',
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: '100',
    inclTaxesCustomer: 112,
    subscription: {
      _id: creditNoteCustomer.subscriptions[0]._id,
      service: { serviceId: new ObjectId(), nature: FIXED, name: 'toto' },
      vat: 5.5,
    },
    misc: 'Je suis un motif',
  };

  const payloadWithBillingItems = {
    date: '2019-07-19T14:00:18',
    customer: creditNoteCustomer._id,
    exclTaxesCustomer: '43.5',
    inclTaxesCustomer: 50,
    misc: 'Je suis un motif',
    billingItemList: [{ billingItem: billingItemList[1]._id, unitInclTaxes: '25', count: 1 }],
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
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithEvents,
          exclTaxesTpp: '100',
          inclTaxesTpp: 100,
          thirdPartyPayer: creditNoteThirdPartyPayer._id,
        },
      });

      expect(response.statusCode).toBe(200);

      const creditNotes = await CreditNote.find({ company: authCompany._id }).lean();
      const cnWithlinkedCreditNotes = creditNotes.filter(cn => cn.linkedCreditNote);
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
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithSubscription,
          exclTaxesTpp: '100',
          inclTaxesTpp: 100,
          thirdPartyPayer: creditNoteThirdPartyPayer._id,
        },
      });

      expect(response.statusCode).toBe(200);

      const creditNotes = await CreditNote.find({ company: authCompany._id }).lean();
      const cnWithlinkedCreditNotes = creditNotes.filter(cn => cn.linkedCreditNote);
      expect(cnWithlinkedCreditNotes.length).toEqual(2);
      expect(cnWithlinkedCreditNotes).toEqual(expect.arrayContaining([
        expect.objectContaining({ number: 'AV-101071900001' }),
        expect.objectContaining({ number: 'AV-101071900002' }),
      ]));
      expect(creditNotes.length).toEqual(initialCreditNotesNumber + 2);
    });

    it('should create a new credit notes with billing items', async () => {
      const initialCreditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: payloadWithBillingItems,
      });

      expect(response.statusCode).toBe(200);

      const creditNotesCount = await CreditNote.countDocuments({ company: authCompany._id });
      expect(creditNotesCount).toEqual(initialCreditNotesNumber + 1);

      const creditNotesWithBillingItems = await CreditNote
        .find({ company: authCompany._id, billingItemList: { $exists: true } })
        .lean();
      expect(creditNotesWithBillingItems.length).toEqual(2);
      expect(creditNotesWithBillingItems).toEqual(expect.arrayContaining([
        expect.objectContaining({ number: 'AV-101071900001' }),
      ]));
    });

    it('should return 404 if billingItemList contains invalid item', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithBillingItems,
          billingItemList: [{ billingItem: new ObjectId(), unitInclTaxes: '25', count: 1 }],
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if customer is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payloadWithEvents, customer: otherCompanyCustomer._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if customer is archived', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: { ...payloadWithEvents, customer: archivedCustomer._id },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if customer subscription is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithSubscription,
          subscription: {
            _id: otherCompanyCustomer.subscriptions[0]._id,
            service: { serviceId: new ObjectId(), nature: FIXED, name: 'titi' },
            vat: 5.5,
          },
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 404 error if third party payer is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithSubscription,
          exclTaxesTpp: '100',
          inclTaxesTpp: 100,
          thirdPartyPayer: otherCompanyThirdPartyPayer._id,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 if one billingItem doesn’t exists', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithEvents,
          events: [{
            eventId: creditNoteEvent._id,
            auxiliary: creditNoteEvent.auxiliary,
            startDate: creditNoteEvent.startDate,
            endDate: creditNoteEvent.endDate,
            serviceName: 'toto',
            bills: {
              billingItems: [{ billingItem: new ObjectId(), exclTaxes: '12', inclTaxes: 14 }],
              inclTaxesCustomer: '10',
              exclTaxesCustomer: '8',
            },
          }],
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 404 error if at least one event is not from same company', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithEvents,
          events: [{
            eventId: creditNoteEvent._id,
            auxiliary: creditNoteEvent.auxiliary,
            startDate: creditNoteEvent.startDate,
            endDate: creditNoteEvent.endDate,
            serviceName: 'toto',
            bills: { inclTaxesCustomer: '10', exclTaxesCustomer: '8' },
          },
          {
            eventId: otherCompanyEvent._id,
            auxiliary: new ObjectId(),
            startDate: otherCompanyEvent.startDate,
            endDate: otherCompanyEvent.endDate,
            serviceName: 'tata',
            bills: { inclTaxesCustomer: '10', exclTaxesCustomer: '8' },
          }],
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 error payload has events and subscription', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithEvents,
          subscription: {
            _id: creditNoteCustomer.subscriptions[0]._id,
            service: { serviceId: new ObjectId(), nature: FIXED, name: 'toto' },
            vat: 5.5,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error payload has events and billingItemList', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithEvents,
          billingItemList: [{ billingItem: billingItemList[1]._id, unitInclTaxes: '25', count: 1 }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 error payload has subscription and billingItemList', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
        payload: {
          ...payloadWithSubscription,
          billingItemList: [{ billingItem: billingItemList[1]._id, unitInclTaxes: '25', count: 1 }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    const missingParams = [
      { param: 'date', payload: payloadWithEvents },
      { param: 'customer', payload: payloadWithEvents },
      { param: 'events[0].eventId', payload: payloadWithEvents },
      { param: 'events[0].auxiliary', payload: payloadWithEvents },
      { param: 'events[0].serviceName', payload: payloadWithEvents },
      { param: 'events[0].startDate', payload: payloadWithEvents },
      { param: 'events[0].endDate', payload: payloadWithEvents },
      { param: 'events[0].bills', payload: payloadWithEvents },
      { param: 'subscription.service', payload: payloadWithSubscription },
      { param: 'billingItemList[0].billingItem', payload: payloadWithBillingItems },
      { param: 'billingItemList[0].unitInclTaxes', payload: payloadWithBillingItems },
      { param: 'billingItemList[0].count', payload: payloadWithBillingItems },
    ];
    missingParams.forEach((test) => {
      it(`should return a 400 error if '${test.param}' params is missing`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/creditNotes',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: omit(test.payload, [test.param]),
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403, erp: false },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
        authToken = await getToken(role.name, role.erp);
        const response = await app.inject({
          method: 'POST',
          url: '/creditNotes',
          headers: { Cookie: `alenvi_token=${authToken}` },
          payload: { ...payloadWithEvents },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - GET /creditNotes', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get all credit notes (company A)', async () => {
      const creditNotesNumber = creditNotesList.length;
      const response = await app.inject({
        method: 'GET',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes.length).toEqual(creditNotesNumber);
    });

    it('should get all credit notes (company B)', async () => {
      authToken = await getTokenByCredentials(otherCompanyUser.local);

      const response = await app.inject({
        method: 'GET',
        url: '/creditNotes',
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.result.data.creditNotes.length).toEqual(1);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: '/creditNotes',
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CREDIT NOTES ROUTES - GET /creditNotes/pdfs', () => {
  let authToken;
  beforeEach(populateDB);

  describe('COACH', () => {
    beforeEach(async () => {
      authToken = await getToken('coach');
    });

    it('should get credit note pdf', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return a 404 error if customer is not from the same company', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/creditNotes/${otherCompanyCreditNote._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Other roles', () => {
    it('should return customer creditnotes pdfs if I am its helper', async () => {
      authToken = await getTokenByCredentials(creditNoteUserList[0].local);
      const res = await app.inject({
        method: 'GET',
        url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'GET',
          url: `/creditNotes/${creditNotesList[0]._id}/pdfs`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

// describe('CREDIT NOTES ROUTES - PUT /creditNotes/:id', () => {
//   let authToken;
//   beforeEach(populateDB);

//   let payload = {
//     date: '2019-07-19T14:00:18',
//     startDate: '2019-07-01T00:00:00',
//     endDate: '2019-07-31T23:59:59',
//     exclTaxesCustomer: 200,
//     inclTaxesCustomer: 224,
//     misc: 'Je suis un motif',
//   };

//   describe('CLIENT_ADMIN', () => {
//     beforeEach(async () => {
//       authToken = await getToken('client_admin');
//     });

//     it('should update a credit note', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[0]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(200);
//       expect(response.result.data.creditNote.inclTaxesCustomer).toEqual(payload.inclTaxesCustomer);
//       expect(response.result.data.creditNote.exclTaxesCustomer).toEqual(payload.exclTaxesCustomer);
//     });

//     it('should update a credit note with billing items', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[4]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload: {
//           date: '2019-07-19T14:00:18',
//           billingItemList: [{ billingItem: billingItemList[1]._id, unitInclTaxes: 25, count: 1 }],
//           exclTaxesCustomer: 20,
//           inclTaxesCustomer: 25,
//         },
//       });

//       expect(response.statusCode).toBe(200);
//       expect(response.result.data.creditNote.inclTaxesCustomer).toEqual(25);
//       expect(response.result.data.creditNote.exclTaxesCustomer).toEqual(20);
//     });

//     it('should return a 400 error if date isn\'t in payload', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[0]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload: { startDate: '2019-07-01T00:00:00', endDate: '2019-07-31T23:59:59' },
//       });

//       expect(response.statusCode).toBe(400);
//     });

//     it('should return a 404 error if credit note does not exist', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${new ObjectId()}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(404);
//     });

//     it('should not update if a billing item does not exist', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[4]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload: {
//           date: '2019-07-19T14:00:18',
//           billingItemList: [{ billingItem: new ObjectId(), unitInclTaxes: 25, count: 1 }],
//           exclTaxesCustomer: 20,
//           inclTaxesCustomer: 25,
//         },
//       });

//       expect(response.statusCode).toBe(404);
//     });

//     it('should return a 403 error if credit not origin is not Compani', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[1]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(403);
//     });

//     it('should return a 403 error if creditNote is for archived customer', async () => {
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[3]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(403);
//     });

//     it('should return a 404 error if at least one event is not from same company', async () => {
//       payload = {
//         events: [{
//           eventId: otherCompanyEvent._id,
//           auxiliary: new ObjectId(),
//           startDate: otherCompanyEvent.startDate,
//           endDate: otherCompanyEvent.endDate,
//           serviceName: 'tata',
//           bills: {
//             inclTaxesCustomer: 10,
//             exclTaxesCustomer: 8,
//           },
//         }],
//         date: '2019-07-19T14:00:18',
//       };

//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[0]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(404);
//     });

//     it('should return a 403 error if customer subscription is not from same company', async () => {
//       payload = {
//         date: '2019-07-19T14:00:18',
//         subscription: {
//           _id: otherCompanyCustomer.subscriptions[0]._id,
//           service: { serviceId: new ObjectId(), nature: FIXED, name: 'titi' },
//           vat: 5.5,
//         },
//       };
//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[0]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(403);
//     });

//     it('should return a 403 error if credit note is not editable', async () => {
//       payload = {
//         date: '2019-07-19T14:00:18',
//         startDate: '2019-07-01T00:00:00',
//         endDate: '2019-07-31T23:59:59',
//         exclTaxesCustomer: 200,
//         inclTaxesCustomer: 224,
//       };

//       const response = await app.inject({
//         method: 'PUT',
//         url: `/creditNotes/${creditNotesList[2]._id}`,
//         headers: { Cookie: `alenvi_token=${authToken}` },
//         payload,
//       });

//       expect(response.statusCode).toBe(403);
//     });
//   });

//   describe('Other roles', () => {
//     const roles = [
//       { name: 'helper', expectedCode: 403 },
//       { name: 'planning_referent', expectedCode: 403 },
//       { name: 'coach', expectedCode: 403 },
//       { name: 'vendor_admin', expectedCode: 403 },
//     ];

//     roles.forEach((role) => {
//       it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
//         authToken = await getToken(role.name);
//         const response = await app.inject({
//           method: 'PUT',
//           url: `/creditNotes/${creditNotesList[0]._id}`,
//           headers: { Cookie: `alenvi_token=${authToken}` },
//           payload,
//         });

//         expect(response.statusCode).toBe(role.expectedCode);
//       });
//     });
//   });
// });

describe('CREDIT NOTES ROUTES - DELETE /creditNotes/:id', () => {
  let authToken;
  beforeEach(populateDB);

  describe('CLIENT_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('client_admin');
    });

    it('should delete a credit note', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(200);
      const deletedCreditNote = await CreditNote.countDocuments({ _id: creditNotesList[0]._id });
      expect(deletedCreditNote).toEqual(0);
    });

    it('should return a 404 error if user is not from credit note company', async () => {
      authToken = await getTokenByCredentials(otherCompanyUser.local);

      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('should return a 403 error if credit note is for archived customer', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[3]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if credit note origin is not COMPANI', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[1]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 error if credit note is not editable', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/creditNotes/${creditNotesList[2]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });
      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'vendor_admin', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/creditNotes/${creditNotesList[0]._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
