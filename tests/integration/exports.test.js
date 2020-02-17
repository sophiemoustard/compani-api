const expect = require('expect');
const moment = require('moment');
const app = require('../../server');
const { SERVICE, AUXILIARY, HELPER, CUSTOMER, FUNDING, SUBSCRIPTION, SECTOR } = require('../../src/helpers/constants');
const { getToken, userList } = require('./seed/authenticationSeed');
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
  billsList,
  creditNotesList,
  auxiliary,
  establishment,
} = require('./seed/exportSeed');
const { formatPrice } = require('../../src/helpers/utils');

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
        expect(rows[1]).toEqual('"Intervention";;"Service 1";"17/01/2019 15:30";"17/01/2019 17:30";"2,00";"Tous les jours";"Etoile";;;;"Oui";"Mme";"LILI";"Lola";;"Non";"Non";;');
        expect(rows[2]).toEqual('"Heure interne";"planning";;"17/01/2019 15:30";"17/01/2019 17:30";"2,00";;"Etoile";"M.";"Lulu";"LALA";"Non";;;;;"Non";"Non";;');
        expect(rows[3]).toEqual('"Intervention";;"Service 1";"16/01/2019 10:30";"16/01/2019 12:30";"2,00";;"Etoile";"M.";"Lulu";"LALA";"Non";"Mme";"LILI";"Lola";"test";"Non";"Oui";"Facturée & payée";"Initiative du de l\'intervenant"');
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
        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(3);
        expect(rows[0]).toEqual('\ufeff"Type";"Nature";"Début";"Fin";"Équipe";"Auxiliaire - Titre";"Auxiliaire - Prénom";"Auxiliaire - Nom";"Divers"');
        expect(rows[1]).toEqual('"Congé";"Journalière";"19/01/2019";"21/01/2019";"Etoile";"M.";"Lulu";"LALA";');
        expect(rows[2]).toEqual('"Absence injustifiée";"Horaire";"19/01/2019 15:00";"19/01/2019 17:00";"Etoile";"M.";"Lulu";"LALA";"test absence"');
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
        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(4);
        expect(rows[0]).toEqual('\ufeff"Nature";"Identifiant";"Date";"Id Bénéficiaire";"Titre";"Nom";"Prénom";"Id tiers payeur";"Tiers payeur";"Montant HT en €";"Montant TTC en €";"Services";"Date de création"');
        expect(rows[1]).toEqual(`"Facture";"FACT-1905002";"29/05/2019";"${billsList[0].customer.toHexString()}";"Mme";"LILI";"Lola";"${billsList[0].thirdPartyPayer.toHexString()}";"Toto";"72,00";"75,96";"Temps de qualité - autonomie - 8 heures - ${formatPrice(billsList[0].subscriptions[0].inclTaxes)} TTC";"${moment().format('DD/MM/YYYY')}"`);
        expect(rows[2]).toEqual(`"Facture";"FACT-1905003";"25/05/2019";"${billsList[1].customer.toHexString()}";"Mme";"LILI";"Lola";;;"96,00";"101,28";"Temps de qualité - autonomie - 4 heures - ${formatPrice(billsList[1].subscriptions[0].inclTaxes)} TTC";"${moment().format('DD/MM/YYYY')}"`);
        expect(rows[3]).toEqual(`"Avoir";;"28/05/2019";"${creditNotesList[0].customer.toHexString()}";"Mme";"LILI";"Lola";;;"110,00";"202,00";"toto";"${moment().format('DD/MM/YYYY')}"`);
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
        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(3);
        expect(rows[0]).toEqual('\ufeff"Nature";"Identifiant";"Date";"Id Bénéficiaire";"Titre";"Nom";"Prénom";"Id tiers payeur";"Tiers payeur";"Moyen de paiement";"Montant TTC en €"');
        expect(rows[1]).toEqual(`"Remboursement";"REG-1903203";"27/05/2019";"${paymentsList[0].customer}";"Mme";"LILI";"Lola";"${paymentsList[0].client}";"Toto";"Prélèvement";"220,00"`);
        expect(rows[2]).toEqual(`"Paiement";"REG-1903201";"26/05/2019";"${paymentsList[1].customer}";"Mme";"LILI";"Lola";"${paymentsList[0].client}";"Toto";"Prélèvement";"190,00"`);
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
        expect(response.result).toBeDefined();
        const rows = response.result.split('\r\n');

        expect(rows.length).toBe(5);
        expect(rows[0]).toEqual('\ufeff"Titre";"Prénom";"Nom";"Equipe";"Date d\'embauche";"Début";"Date de notif";"Motif";"Fin";"Heures contrat";"Heures à travailler";"Heures travaillées";"Dont exo non majo";"Dont exo et majo";"Détails des majo exo";"Dont non exo et non majo";"Dont non exo et majo";"Détails des majo non exo";"Solde heures";"Dont diff mois précédent";"Compteur";"Heures sup à payer";"Heures comp à payer";"Mutuelle";"Transport";"Autres frais";"Prime";"Indemnité"');
        expect(rows[1]).toEqual('"M.";"Lulu";"LALA";"Etoile";"01/01/2018";"01/01/2019";;;"31/01/2019";"151,00";"30,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"0,00";"0,00";"0,00"');
        expect(rows[2]).toEqual('"M.";"Lulu";"LALA";"Etoile";"01/01/2018";"01/01/2019";;;"28/02/2019";"151,00";"20,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"0,00";"0,00";"0,00"');
        expect(rows[3]).toEqual('"M.";"Lulu";"LALA";"Etoile";"01/01/2018";"01/01/2019";"25/01/2019";;"31/01/2019";"151,00";"20,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"0,00";"0,00";"10,00"');
        expect(rows[4]).toEqual('"M.";"Lulu";"LALA";"Etoile";"01/01/2018";"01/01/2019";"25/02/2019";;"28/02/2019";"151,00";"20,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"0,00";"0,00";"10,00"');
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
      expectedRows: [
        '\ufeff"Nature";"Type";"Entreprise";"Nom";"Montant unitaire par défaut";"TVA (%)";"Plan de majoration";"Date de début";"Date de création";"Date de mise a jour"',
        `"Horaire";"Prestataire";"Test SAS";"Service 1";"24,00";"0,00";;"16/01/2019";"${moment().format('DD/MM/YYYY')}";"${moment().format('DD/MM/YYYY')}"`,
        `"Horaire";"Mandataire";"Test SAS";"Service 2";"24,00";"12,00";;"18/01/2019";"${moment().format('DD/MM/YYYY')}";"${moment().format('DD/MM/YYYY')}"`,
      ],
    },
    {
      exportType: AUXILIARY,
      populate: populateUser,
      lineCount: 4,
      expectedRows: [
        '\ufeff"Email";"Équipe";"Id de l\'auxiliaire";"Titre";"Nom";"Prénom";"Date de naissance";"Pays de naissance";"Departement de naissance";"Ville de naissance";"Nationalité";"N° de sécurité sociale";"Addresse";"Téléphone";"Nombre de contracts";"Établissement";"Date de début de contrat prestataire";"Date de fin de contrat prestataire";"Date d\'inactivité";"Date de création"',
        `"auxiliary@alenvi.io";"Test";${userList[2]._id};"M.";"TEST";"Auxiliary";;;;;;;;;0;;;;;"${moment().format('DD/MM/YYYY')}"`,
        `"planning-referent@alenvi.io";"Test";${userList[4]._id};"Mme";"TEST";"PlanningReferent";;;;;;;;;0;;;;;"${moment().format('DD/MM/YYYY')}"`,
        `"toto_auxiliary@alenvi.io";;${auxiliary._id};"M.";"LALA";"Lulu";"01/01/1992";"France";"75";"Paris";"Française";12345678912345;"37 rue de ponthieu 75008 Paris";"0123456789";1;"${establishment.name}";"01/01/2018";"01/01/2022";"31/01/2022";"${moment().format('DD/MM/YYYY')}"`,
      ],
    },
    {
      exportType: HELPER,
      populate: populateUser,
      lineCount: 3,
      expectedRows: [
        '\ufeff"Email";"Aidant - Nom";"Aidant - Prénom";"Bénéficiaire - Titre";"Bénéficiaire - Nom";"Bénéficiaire - Prénom";"Bénéficiaire - Rue";"Bénéficiaire - Code postal";"Bénéficiaire - Ville";"Bénéficiaire - Statut";"Date de création"',
        `"helper@alenvi.io";"TEST";"Helper";;;;;;;"Inactif";"${moment().format('DD/MM/YYYY')}"`,
        `"toto@alenvi.io";"TOTO";"test";"Mme";"LILI";"Lola";"37 rue de Ponthieu";"75008";"Paris";"Actif";"${moment().format('DD/MM/YYYY')}"`,
      ],
    },
    {
      exportType: CUSTOMER,
      populate: populateCustomer,
      lineCount: 5,
      expectedRows: [
        '\ufeff"Titre";"Nom";"Prenom";"Date de naissance";"Adresse";"1ère intervention";"Auxiliaire référent";"Environnement";"Objectifs";"Autres";"Nom associé au compte bancaire";"IBAN";"BIC";"RUM";"Date de signature du mandat";"Nombre de souscriptions";"Souscriptions";"Nombre de financements";"Date de création";"Statut"',
        '"M.";"BARDET";"Romain";"01/01/1940";"37 rue de ponthieu 75008 Paris";"17/01/2020";"Lulu Lala";"test";"toto";"123456789";"Test Toto";"FR6930003000405885475816L80";"ABNAFRPP";;;2;"Service 1',
        ` Service 2";1;"${moment().format('DD/MM/YYYY')}";"Actif"`,
        `"M.";"BERNAL";"Egan";;"37 rue de ponthieu 75008 Paris";;;;;;;;;;;0;;0;"${moment().format('DD/MM/YYYY')}";"Inactif"`,
        `"M.";"ALAPHILIPPE";"Julian";;"37 rue de ponthieu 75008 Paris";;;;;;;;;;;0;;0;"${moment().format('DD/MM/YYYY')}";"Inactif"`,
      ],
    },
    {
      exportType: FUNDING,
      populate: populateCustomer,
      lineCount: 2,
      expectedRows: [
        '\ufeff"Titre";"Nom";"Prénom";"Tiers payeur";"Nature";"Service";"Date de début";"Date de fin";"Numéro de dossier";"Fréquence";"Montant TTC";"Montant unitaire TTC";"Nombre d\'heures";"Jours";"Participation du bénéficiaire"',
        '"M.";"BARDET";"Romain";"tiers payeurs";"Forfaitaire";"Service 1";"03/02/2018";;"12345";"Mensuelle";"21,00";"10,00";"9,00";"Lundi Mardi Mercredi ";"12,00"',
      ],
    },
    {
      exportType: SUBSCRIPTION,
      populate: populateCustomer,
      lineCount: 3,
      expectedRows: [
        '\ufeff"Titre";"Nom";"Prénom";"Service";"Prix unitaire TTC";"Volume hebdomadaire estimatif";"Dont soirées";"Dont dimanches"',
        '"M.";"BARDET";"Romain";"Service 1";"12,00";"30,00";1;2',
        '"M.";"BARDET";"Romain";"Service 2";;;;',
      ],
    },
    {
      exportType: SECTOR,
      populate: populateSectorHistories,
      lineCount: 4,
      expectedRows: [
        '\ufeff"Equipe";"Id de l\'auxiliaire";"Nom";"Prénom";"Date d\'arrivée dans l\'équipe";"Date de départ de l\'équipe"',
        `"Test";${userList[2]._id};"Test";"Auxiliary";"10/12/2018";`,
        `"Test";${userList[4]._id};"Test";"PlanningReferent";"10/12/2018";`,
        `"Etoile";${auxiliary._id};"Lala";"Lulu";"10/12/2018";`,
      ],
    },
  ];

  exportTypes.forEach(({ exportType, populate, lineCount, expectedRows }) => {
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
          const rows = response.result.split('\r\n');
          expect(rows.length).toBe(lineCount);

          for (let i = 0; i < rows.length; i++) {
            expect(rows[i]).toEqual(expectedRows[i]);
          }
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
