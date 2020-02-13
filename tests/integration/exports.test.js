const expect = require('expect');
const app = require('../../server');
const { SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION, SECTOR } = require('../../src/helpers/constants');
const { getToken } = require('./seed/authenticationSeed');
const {
  populateEvents,
  populateBillsAndCreditNotes,
  populatePayment,
  populatePay,
  paymentsList,
  populateService,
  populateUser,
  populateCustomer,
  populateSectorHistories,
} = require('./seed/exportSeed');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('EXPORTS ROUTES', () => {
  let clientAdminToken = null;

  describe('GET /exports/working_event/history', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateEvents);
      beforeEach(async () => {
        clientAdminToken = await getToken('client_admin');
      });
      it('should get working events', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/working_event/history?startDate=2019-01-15&endDate=2019-01-20',
          headers: { 'x-access-token': clientAdminToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(4);
        expect(rows[0]).toEqual('\ufeff"Type";"Heure interne";"Service";"Début";"Fin";"Durée";"Répétition";"Équipe";"Auxiliaire - Titre";"Auxiliaire - Prénom";"Auxiliaire - Nom";"A affecter";"Bénéficiaire - Titre";"Bénéficiaire - Nom";"Bénéficiaire - Prénom";"Divers";"Facturé";"Annulé";"Statut de l\'annulation";"Raison de l\'annulation"');
        expect(rows[1]).toEqual('"Intervention";;"Service 1";"17/01/2019 15:30";"17/01/2019 17:30";"2,00";"Tous les jours";"Etoile";;;;"Oui";;"LILI";"Lola";;"Non";"Non";;');
        expect(rows[2]).toEqual('"Heure interne";"planning";;"17/01/2019 15:30";"17/01/2019 17:30";"2,00";;"Etoile";"M.";"Lulu";"LALA";"Non";;;;;"Non";"Non";;');
        expect(rows[3]).toEqual('"Intervention";;"Service 1";"16/01/2019 10:30";"16/01/2019 12:30";"2,00";;"Etoile";"M.";"Lulu";"LALA";"Non";;"LILI";"Lola";"test";"Non";"Oui";"Facturée & payée";"Initiative du de l\'intervenant"');
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
          clientAdminToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/working_event/history?startDate=2019-01-15&endDate=2019-01-17',
            headers: { 'x-access-token': clientAdminToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/absence/history', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateEvents);
      beforeEach(async () => {
        clientAdminToken = await getToken('client_admin');
      });
      it('should get absences', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/absence/history?startDate=2019-01-15&endDate=2019-01-21',
          headers: { 'x-access-token': clientAdminToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(2);
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
          clientAdminToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/absence/history?startDate=2019-01-15&endDate=2019-01-17',
            headers: { 'x-access-token': clientAdminToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/bill/history', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populateBillsAndCreditNotes);
      beforeEach(async () => {
        clientAdminToken = await getToken('client_admin');
      });
      it('should get bills and credit notes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/bill/history?startDate=2019-05-25&endDate=2019-05-29',
          headers: { 'x-access-token': clientAdminToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(4);
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
          clientAdminToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/bill/history?startDate=2019-05-26&endDate=2019-05-29',
            headers: { 'x-access-token': clientAdminToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/payment/history', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populatePayment);
      beforeEach(async () => {
        clientAdminToken = await getToken('client_admin');
      });
      it('should get payments', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/payment/history?startDate=2019-05-25&endDate=2019-05-31',
          headers: { 'x-access-token': clientAdminToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(paymentsList.length);
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
          clientAdminToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/payment/history?startDate=2019-05-25&endDate=2019-05-31',
            headers: { 'x-access-token': clientAdminToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  describe('GET /exports/pay/history', () => {
    describe('CLIENT_ADMIN', () => {
      beforeEach(populatePay);
      beforeEach(async () => {
        clientAdminToken = await getToken('client_admin');
      });
      it('should get pay', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/exports/pay/history?startDate=2019-01-01&endDate=2019-05-31',
          headers: { 'x-access-token': clientAdminToken },
        });

        expect(response.statusCode).toBe(200);
        expect(response.result).toBeDefined();
        expect(response.result.split('\r\n').length).toBe(5);
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
          clientAdminToken = await getToken(role.name);
          const response = await app.inject({
            method: 'GET',
            url: '/exports/pay/history?startDate=2019-01-01&endDate=2019-05-31',
            headers: { 'x-access-token': clientAdminToken },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });

  const exportTypes = [
    {
      exportType: SERVICE,
      populate: populateService,
      lineCount: 3,
    },
    {
      exportType: AUXILIARY,
      populate: populateUser,
      lineCount: 3,
    },
    {
      exportType: HELPER,
      populate: populateUser,
      lineCount: 3,
    },
    {
      exportType: CUSTOMER,
      populate: populateCustomer,
      lineCount: 5,
    },
    {
      exportType: FUNDING,
      populate: populateCustomer,
      lineCount: 2,
    },
    {
      exportType: SUBSCRIPTION,
      populate: populateCustomer,
      lineCount: 3,
    },
    {
      exportType: SECTOR,
      populate: populateSectorHistories,
      lineCount: 2,
    },
  ];

  exportTypes.forEach(({ exportType, populate, lineCount }) => {
    describe(`GET /exports/${exportType}/data`, () => {
      describe('CLIENT_ADMIN', () => {
        beforeEach(populate);
        beforeEach(async () => {
          clientAdminToken = await getToken('client_admin');
        });
        it(`should get ${exportType}`, async () => {
          const response = await app.inject({
            method: 'GET',
            url: `/exports/${exportType}/data`,
            headers: { 'x-access-token': clientAdminToken },
          });

          expect(response.statusCode).toBe(200);
          expect(response.result).toBeDefined();
          expect(response.result.split('\r\n').length).toBe(lineCount);
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
            clientAdminToken = await getToken(role.name);
            const response = await app.inject({
              method: 'GET',
              url: `/exports/${exportType}/data`,
              headers: { 'x-access-token': clientAdminToken },
            });

            expect(response.statusCode).toBe(role.expectedCode);
          });
        });
      });
    });
  });
});
