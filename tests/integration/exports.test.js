/* eslint-disable max-len */
const expect = require('expect');
const moment = require('../../src/extensions/moment');
const app = require('../../server');
const {
  SERVICE,
  AUXILIARY,
  HELPER,
  CUSTOMER,
  FUNDING,
  SUBSCRIPTION,
  SECTOR,
  RUP,
  REFERENT,
  PAY,
  PAYMENT,
  BILL,
  ABSENCE,
  WORKING_EVENT,
  COURSE,
  COURSE_SLOT,
  TRANSPORT,
} = require('../../src/helpers/constants');
const { getToken } = require('./helpers/authentication');
const {
  paymentsList,
  populateDB,
  customersList,
  user,
  billsList,
  creditNotesList,
  auxiliaryList,
  establishment,
  thirdPartyPayer,
  courseList,
  courseSlotList,
} = require('./seed/exportsSeed');
const { helper, userList } = require('../seed/authUsersSeed');
const { formatPrice } = require('../../src/helpers/utils');
const { authCustomer } = require('../seed/authCustomers');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

const clientHistoryExportTypes = [
  {
    exportType: WORKING_EVENT,
    expectedRows: [
      '\ufeff"Type";"Heure interne";"Service";"Début planifié";"Début horodaté";"Type d\'horodatage";"Motif";"Fin planifiée";"Fin horodatée";"Type d\'horodatage";"Motif";"Durée";"Répétition";"Déplacement véhiculé avec bénéficiaire";"Mode de transport spécifique";"Équipe";"Id Auxiliaire";"Auxiliaire - Titre";"Auxiliaire - Prénom";"Auxiliaire - Nom";"A affecter";"Id Bénéficiaire";"Bénéficiaire - Titre";"Bénéficiaire - Nom";"Bénéficiaire - Prénom";"Divers";"Facturé";"Annulé";"Statut de l\'annulation";"Raison de l\'annulation"',
      `"Intervention";;"Service 1";"17/01/2019 15:30:19";"17/01/2019 15:35:19";"Manuel";"QR Code manquant";"17/01/2019 17:30:19";"17/01/2019 17:35:19";"QR Code";;"2,00";"Tous les jours";"23";"Transports en commun / À pied";"Etoile";;;;;"Oui";${customersList[3]._id.toHexString()};"M.";"BARDET";"Romain";;"Non";"Non";;`,
      `"Heure interne";"planning";;"17/01/2019 15:30:19";;;;"17/01/2019 17:30:19";;;;"2,00";;;;"Etoile";${auxiliaryList[0]._id.toHexString()};"M.";"Lulu";"UIUI";"Non";;;;;;"Non";"Non";;`,
      `"Intervention";;"Service 1";"16/01/2019 10:30:19";;;;"16/01/2019 12:30:21";;;;"2,00";;;;"Etoile";${auxiliaryList[0]._id.toHexString()};"M.";"Lulu";"UIUI";"Non";${customersList[3]._id.toHexString()};"M.";"BARDET";"Romain";"test";"Non";"Oui";"Facturée & payée";"Initiative de l'intervenant(e)"`,
    ],
    query: 'startDate=2019-01-15T10:00:00.000Z&endDate=2019-01-20T10:00:00.000Z',
  },
  {
    exportType: ABSENCE,
    expectedRows: [
      '\ufeff"Id Auxiliaire";"Auxiliaire - Prénom";"Auxiliaire - Nom";"Auxiliaire - Titre";"Équipe";"Type";"Nature";"Début";"Fin";"Equivalent heures contrat";"Prolongation";"Absence d\'origine";"Divers"',
      `${auxiliaryList[0]._id.toHexString()};"Lulu";"UIUI";"M.";"Etoile";"Absence injustifiée";"Horaire";"19/01/2019 14:00";"19/01/2019 16:00";"2,00";"non";;"test absence"`,
      `${auxiliaryList[0]._id.toHexString()};"Lulu";"UIUI";"M.";"Etoile";"Congé";"Journalière";"19/01/2019";"21/01/2019";"4,00";"non";;`,
    ],
    query: 'startDate=2019-01-15T10:00:00.000Z&endDate=2019-01-21T10:00:00.000Z',
  },
  {
    exportType: BILL,
    expectedRows: [
      '\ufeff"Nature";"Identifiant";"Date";"Id Bénéficiaire";"Titre";"Nom";"Prénom";"Id tiers payeur";"Tiers payeur";"Montant HT en €";"Montant TTC en €";"Nombre d\'heures";"Services";"Date de création"',
      `"Facture";"FACT-1905002";"29/05/2019";"${billsList[0].customer.toHexString()}";"M.";"BARDET";"Romain";"${billsList[0].thirdPartyPayer.toHexString()}";"Toto";"72,00";"75,96";"8,00";"Temps de qualité - autonomie - 8,00h - ${formatPrice(billsList[0].subscriptions[0].inclTaxes)} TTC";"${moment().format('DD/MM/YYYY')}"`,
      `"Facture";"FACT-1905003";"25/05/2019";"${billsList[1].customer.toHexString()}";"M.";"BARDET";"Romain";;;"96,00";"101,28";"4,00";"Temps de qualité - autonomie - 4,00h - ${formatPrice(billsList[1].subscriptions[0].inclTaxes)} TTC";"${moment().format('DD/MM/YYYY')}"`,
      `"Avoir";;"28/05/2019";"${creditNotesList[0].customer.toHexString()}";"M.";"BARDET";"Romain";"${thirdPartyPayer._id}";"Toto";"110,00";"202,00";;"toto";"${moment().format('DD/MM/YYYY')}"`,
    ],
    query: 'startDate=2019-05-25T10:00:00.000Z&endDate=2019-05-29T10:00:00.000Z',
  },
  {
    exportType: PAYMENT,
    expectedRows: [
      '\ufeff"Nature";"Identifiant";"Date";"Id Bénéficiaire";"Titre";"Nom";"Prénom";"Id tiers payeur";"Tiers payeur";"Moyen de paiement";"Montant TTC en €"',
      `"Remboursement";"REG-1903203";"27/05/2019";"${paymentsList[0].customer}";"M.";"BARDET";"Romain";"${paymentsList[0].thirdPartyPayer}";"Toto";"Prélèvement";"220,00"`,
      `"Paiement";"REG-1903201";"26/05/2019";"${paymentsList[1].customer}";"M.";"BARDET";"Romain";"${paymentsList[0].thirdPartyPayer}";"Toto";"Prélèvement";"190,00"`,
    ],
    query: 'startDate=2019-05-25T10:00:00.000Z&endDate=2019-05-31T10:00:00.000Z',
  },
  {
    exportType: PAY,
    expectedRows: [
      '\ufeff"Id Auxiliaire";"Titre";"Prénom";"Nom";"Equipe";"Date d\'embauche";"Début";"Date de notif";"Motif";"Fin";"Heures contrat";"Heures absences";"Heures à travailler";"Heures travaillées";"Dont exo non majo";"Dont exo et majo";"Détails des majo exo";"Dont non exo et non majo";"Dont non exo et majo";"Détails des majo non exo";"Heures transports";"Solde heures";"Dont diff mois précédent";"Compteur";"Heures sup à payer";"Heures comp à payer";"Mutuelle";"Remboursement transport";"Km payés";"Km parcourus";"Frais téléphoniques";"Prime";"Indemnité"',
      `${auxiliaryList[0]._id.toHexString()};"M.";"Lulu";"UIUI";"Etoile";"01/01/2018";"01/01/2019";;;"31/01/2019";"151,00";"10,00";"30,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"6,00";"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"12,00";"14,00";"0,00";"0,00";"0,00"`,
      `${auxiliaryList[0]._id.toHexString()};"M.";"Lulu";"UIUI";"Etoile";"01/01/2018";"01/01/2019";;;"28/02/2019";"151,00";"10,00";"20,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"6,00";"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"12,00";"14,00";"0,00";"0,00";"0,00"`,
      `${auxiliaryList[0]._id.toHexString()};"M.";"Lulu";"UIUI";"Etoile";"01/01/2018";"01/01/2019";"25/01/2019";;"31/01/2019";"151,00";"10,00";"20,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"6,00";"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"12,00";"14,00";"0,00";"0,00";"10,00"`,
      `${auxiliaryList[0]._id.toHexString()};"M.";"Lulu";"UIUI";"Etoile";"01/01/2018";"01/01/2019";"25/02/2019";;"28/02/2019";"151,00";"10,00";"20,00";"143,00";"99,00";"2,00";;"45,00";"5,00";;"6,00";"0,00";"8,00";"-20,00";"0,00";"0,00";"Non";"10,00";"12,00";"14,00";"0,00";"0,00";"10,00"`,
    ],
    query: 'startDate=2019-01-01T10:00:00.000Z&endDate=2019-05-31T10:00:00.000Z',
  },
  {
    exportType: TRANSPORT,
    expectedRows: [
      '\ufeff"Id de l\'auxiliaire";"Prénom  de l\'auxiliaire";"Nom  de l\'auxiliaire";"Heure de départ du trajet";"Heure d\'arrivée du trajet";"Adresse de départ";"Adresse d\'arrivée";"Distance";"Mode de transport";"Durée du trajet";"Durée inter vacation";"Pause prise en compte";"Heures prise en compte"',
      `"${auxiliaryList[0]._id}";"Lulu";"Uiui";"11/01/2019 09:30:00";"11/01/2019 10:30:00";"42 Rue de la Procession 75015 Paris";"37 Rue de Ponthieu 75008 Paris";0.23;"Transports en commun / À pied";"0h03";"1h";"Non";"0,0639"`,
      `"${auxiliaryList[1]._id}";"Lili";"Lolo";"11/01/2019 11:30:00";"11/01/2019 12:35:00";"42 Rue de la Procession 75015 Paris";"35 Rue du Test 75015 Paris";0.23;"Véhicule personnel";"1h05";"1h05";"Oui";"1,0833"`,
    ],
    query: 'startDate=2019-01-01&endDate=2019-01-31',
  },
];

const vendorHistoryExportTypes = [
  {
    exportType: COURSE,
    expectedRows: [
      '\ufeff"Identifiant";"Type";"Structure";"Programme";"Sous-Programme";"Infos complémentaires";"Formateur";"Référent Compani";"Contact pour la formation";"Nombre d\'inscrits";"Nombre de dates";"Nombre de créneaux";"Nombre de créneaux à planifier";"Durée Totale";"Nombre de SMS envoyés";"Nombre de personnes connectées à l\'app";"Début de formation";"Fin de formation";"Nombre de feuilles d\'émargement chargées";"Nombre de présences";"Nombre d\'absences";"Nombre de stagiaires non prévus";"Nombre de présences non prévues";"Avancement"',
      `${courseList[0]._id};"intra";"Test SAS";"Program 1";"subProgram 1";"group 1";"Gilles FORMATEUR";"Aline CONTACT-COM";"Aline CONTACT-COM";3;1;2;;"4,00";2;2;"01/05/2021 10:00:00";"01/05/2021 18:00:00";1;3;3;0;0;"1,00"`,
      `${courseList[1]._id};"inter_b2b";;"Program 2";"subProgram 2";"group 2";"Gilles FORMATEUR";"Aline CONTACT-COM";"Aline CONTACT-COM";2;2;2;1;"4,00";1;0;"01/02/2021 09:00:00";"à planifier";0;2;2;1;2;"0,67"`,
    ],
    query: 'startDate=2021-01-15T10:00:00.000Z&endDate=2022-01-20T10:00:00.000Z',
  },
  {
    exportType: COURSE_SLOT,
    expectedRows: [
      '\ufeff"Id Créneau";"Id Formation";"Étape";"Type";"Date de création";"Date de début";"Date de fin";"Durée";"Adresse";"Nombre de présences";"Nombre d\'absences";"Nombre de présences non prévues"',
      `${courseSlotList[0]._id};${courseList[0]._id};"étape 1";"présentiel";"12/12/2020 11:00:00";"01/05/2021 10:00:00";"01/05/2021 12:00:00";"2,00";"24 Avenue Daumesnil 75012 Paris";1;2;0`,
      `${courseSlotList[1]._id};${courseList[0]._id};"étape 2";"distanciel";"12/12/2020 11:00:01";"01/05/2021 16:00:00";"01/05/2021 18:00:00";"2,00";"https://meet.google.com";2;1;0`,
      `${courseSlotList[2]._id};${courseList[1]._id};"étape 1";"présentiel";"12/12/2020 11:00:02";"01/02/2021 09:00:00";"01/02/2021 11:00:00";"2,00";"24 Avenue Daumesnil 75012 Paris";1;1;1`,
      `${courseSlotList[3]._id};${courseList[1]._id};"étape 3";"eLearning";"12/12/2020 11:00:03";"02/02/2021 09:00:00";"02/02/2021 11:00:00";"2,00";;1;1;1`,
    ],
    query: 'startDate=2021-01-15T10:00:00.000Z&endDate=2022-01-20T10:00:00.000Z',
  },
];

clientHistoryExportTypes.forEach(({ exportType, expectedRows, query }) => {
  describe(`EXPORTS ROUTES - GET /exports/${exportType}/history`, () => {
    let authToken;
    before(populateDB);

    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it(`should get ${exportType}`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/exports/${exportType}/history?${query}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);

        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(expectedRows.length);

        for (let i = 0; i < expectedRows.length; i++) expect(rows.some(r => r === expectedRows[i])).toBeTruthy();
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 403, erp: false },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
          authToken = await getToken(role.name, role.erp);
          const response = await app.inject({
            method: 'GET',
            url: `/exports/${exportType}/history?${query}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

vendorHistoryExportTypes.forEach(({ exportType, expectedRows, query }) => {
  describe(`EXPORTS ROUTES - GET /exports/${exportType}/history`, () => {
    let authToken;
    before(populateDB);

    describe('TRAINING_ORGANISATION_MANAGER', () => {
      beforeEach(async () => {
        authToken = await getToken('training_organisation_manager');
      });

      it(`should get ${exportType}`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/exports/${exportType}/history?${query}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);

        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(expectedRows.length);

        for (let i = 0; i < expectedRows.length; i++) expect(rows.some(r => r === expectedRows[i])).toBeTruthy();
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 403 },
        { name: 'trainer', expectedCode: 403 },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
          authToken = await getToken(role.name, role.erp);
          const response = await app.inject({
            method: 'GET',
            url: `/exports/${exportType}/history?${query}`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});

const dataExportTypes = [
  {
    exportType: SERVICE,
    expectedRows: [
      '\ufeff"Nature";"Entreprise";"Nom";"Montant unitaire par défaut";"TVA (%)";"Plan de majoration";"Date de début";"Date de création";"Date de mise a jour"',
      `"Horaire";"Test SAS";"Service 1";"24,00";"0,00";;"16/01/2019";"${moment().format('DD/MM/YYYY')}";"${moment().format('DD/MM/YYYY')}"`,
      `"Horaire";"Test SAS";"Service 2";"24,00";"12,00";;"18/01/2019";"${moment().format('DD/MM/YYYY')}";"${moment().format('DD/MM/YYYY')}"`,
    ],
  },
  {
    exportType: AUXILIARY,
    expectedRows: [
      '\ufeff"Email";"Équipe";"Id Auxiliaire";"Titre";"Nom";"Prénom";"Date de naissance";"Pays de naissance";"Departement de naissance";"Ville de naissance";"Nationalité";"N° de sécurité sociale";"Addresse";"Téléphone";"Nombre de contracts";"Établissement";"Date de début de contrat prestataire";"Date de fin de contrat prestataire";"Date d\'inactivité";"Date de création"',
      `"auxiliary@alenvi.io";"Test";${userList[2]._id};"M.";"OLAIT";"Auxiliary";;;;;;;;;0;;;;;"${moment().format('DD/MM/YYYY')}"`,
      `"auxiliary-without-company@alenvi.io";;${userList[3]._id};;"CRÉOLE";"Auxiliary without company";;;;;;;;;0;;;;;"${moment().format('DD/MM/YYYY')}"`,
      `"planning-referent@alenvi.io";"Test";${userList[4]._id};"Mme";"TEST";"PlanningReferent";;;;;;;;;0;;;;;"${moment().format('DD/MM/YYYY')}"`,
      `"export_auxiliary_1@alenvi.io";"Etoile";${auxiliaryList[0]._id};"M.";"UIUI";"Lulu";"01/01/1992";"France";"75";"Paris";"Française";12345678912345;"37 rue de ponthieu 75008 Paris";"0123456789";2;"${establishment.name}";"01/01/2018";"01/01/2020";;"${moment().format('DD/MM/YYYY')}"`,
      `"export_auxiliary_1@alenvi.io";"Etoile";${auxiliaryList[0]._id};"M.";"UIUI";"Lulu";"01/01/1992";"France";"75";"Paris";"Française";12345678912345;"37 rue de ponthieu 75008 Paris";"0123456789";2;"${establishment.name}";"01/02/2020";;;"${moment().format('DD/MM/YYYY')}"`,
      `"export_auxiliary_2@alenvi.io";;${auxiliaryList[1]._id};"M.";"LOLO";"Lili";"01/01/1992";"France";"75";"Paris";"Française";12345678912345;"37 rue de ponthieu 75008 Paris";"0123456789";1;"${establishment.name}";"01/02/2020";;;"${moment().format('DD/MM/YYYY')}"`,
    ],
  },
  {
    exportType: HELPER,
    expectedRows: [
      '\ufeff"Email";"Téléphone";"Id Aidant(e)";"Aidant(e) - Nom";"Aidant(e) - Prénom";"Id Bénéficiaire";"Bénéficiaire - Titre";"Bénéficiaire - Nom";"Bénéficiaire - Prénom";"Bénéficiaire - Rue";"Bénéficiaire - Code postal";"Bénéficiaire - Ville";"Date de création"',
      `"helper@alenvi.io";;${helper._id.toHexString()};"TEST";"Helper";${authCustomer._id.toHexString()};"M.";"LACORDÉE";"vian";"37 rue de Ponthieu";"75008";"Paris";"${moment().format('DD/MM/YYYY')}"`,
      `"toto@alenvi.io";"+33123456789";${user._id.toHexString()};"TOTO";"test";${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";"37 rue de Ponthieu";"75008";"Paris";"${moment().format('DD/MM/YYYY')}"`,
    ],
  },
  {
    exportType: CUSTOMER,
    expectedRows: [
      '\ufeff"Id Bénéficiaire";"Titre";"Nom";"Prenom";"Date de naissance";"Adresse";"Ville";"1ère intervention";"Id Auxiliaire référent(e)";"Auxiliaire référent(e)";"Situation";"Environnement";"Objectifs";"Autres";"Nom associé au compte bancaire";"IBAN";"BIC";"RUM";"Date de signature du mandat";"Nombre de souscriptions";"Souscriptions";"Nombre de financements";"Date de création";"Statut"',
      `${authCustomer._id.toHexString()};"M.";"LACORDÉE";"vian";;"37 rue de ponthieu 75008 Paris";"Paris";;;;"Non renseigné";;;;;;;;;0;;0;"${moment().format('DD/MM/YYYY')}";"Actif"`,
      `${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";"01/01/1940";"37 rue de ponthieu 75008 Paris";"Paris";"17/01/2020";${auxiliaryList[0]._id};"Lulu Uiui";"Domicile";"test";"toto";"123456789";"Test Toto";"FR6930003000405885475816L80";"ABNAFRPP";;;2;"Service 1`,
      ` Service 2";1;"${moment().format('DD/MM/YYYY')}";"Archivé"`,
      `${customersList[1]._id.toHexString()};"M.";"BERNAL";"Egan";;"37 rue de ponthieu 75008 Paris";"Paris";;${auxiliaryList[0]._id};"Lulu Uiui";"EHPAD";;;;;;;;;0;;0;"${moment().format('DD/MM/YYYY')}";"Arrêté"`,
      `${customersList[2]._id.toHexString()};"M.";"ALAPHILIPPE";"Julian";;"37 rue de ponthieu 75008 Paris";"Paris";;;;"Domicile";;;;;;;;;0;;0;"${moment().format('DD/MM/YYYY')}";"Actif"`,
      `${customersList[3]._id.toHexString()};"M.";"BARDET";"Romain";;"37 rue de ponthieu 75008 Paris";"Paris";"11/01/2019";;;"Non renseigné";;;;;;;;;1;"Service 1";1;"${moment().format('DD/MM/YYYY')}";"Actif"`,
    ],
  },
  {
    exportType: FUNDING,
    expectedRows: [
      '\ufeff"Id Bénéficiaire";"Titre";"Nom";"Prénom";"Id tiers payeur";"Tiers payeur";"Code EPA";"Nature";"Service";"Date de début";"Date de fin";"Numéro de dossier";"Fréquence";"Montant TTC";"Montant unitaire TTC";"Nombre d\'heures";"Jours";"Participation du/de la bénéficiaire"',
      `${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";${billsList[0].thirdPartyPayer.toHexString()};"Toto";;"Forfaitaire";"Service 1";"03/02/2018";;"12345";"Mensuelle";"21,00";"10,00";"9,00";"Lundi Mardi Mercredi";"12,00"`,
      `${customersList[3]._id.toHexString()};"M.";"BARDET";"Romain";${billsList[0].thirdPartyPayer.toHexString()};"Toto";;"Forfaitaire";"Service 1";"02/02/2020";;"D123456";"Une seule fois";"1600,00";;;"Lundi Mardi Mercredi Jeudi Vendredi Samedi";"66,00"`,
    ],
  },
  {
    exportType: SUBSCRIPTION,
    expectedRows: [
      '\ufeff"Id Bénéficiaire";"Titre";"Nom";"Prénom";"Service";"Prix unitaire TTC";"Volume hebdomadaire estimatif";"Dont soirées";"Dont dimanches"',
      `${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";"Service 1";"12,00";"30,00";1;2`,
      `${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";"Service 2";;;;`,
      `${customersList[3]._id.toHexString()};"M.";"BARDET";"Romain";"Service 1";"12,00";"12,00";2;1`,
    ],
  },
  {
    exportType: SECTOR,
    expectedRows: [
      '\ufeff"Equipe";"Id Auxiliaire";"Nom";"Prénom";"Date d\'arrivée dans l\'équipe";"Date de départ de l\'équipe"',
      `"Test";${userList[2]._id};"Olait";"Auxiliary";"10/12/2020";`,
      `"Test";${userList[4]._id};"Test";"PlanningReferent";"10/12/2018";`,
      `"Etoile";${auxiliaryList[0]._id};"Uiui";"Lulu";"10/12/2018";`,
    ],
  },
  {
    exportType: RUP,
    expectedRows: [
      '\ufeff"Id Auxiliaire";"Nom";"Prénom";"Civilité";"Date de naissance";"Nationalité";"Emploi";"Type de contrat";"Date de début";"Date de fin"',
      `${auxiliaryList[0]._id.toHexString()};"UIUI";"Lulu";"M.";"01/01/1992";"Française";"Auxiliaire de vie";"CDI";"01/01/2018";"01/01/2020"`,
      `${auxiliaryList[0]._id.toHexString()};"UIUI";"Lulu";"M.";"01/01/1992";"Française";"Auxiliaire de vie";"CDI";"01/02/2020";`,
      `${auxiliaryList[1]._id.toHexString()};"LOLO";"Lili";"M.";"01/01/1992";"Française";"Auxiliaire de vie";"CDI";"01/02/2020";`,
    ],
  },
  {
    exportType: REFERENT,
    expectedRows: [
      '\ufeff"Id Bénéficiaire";"Bénéficiaire - Titre";"Bénéficiaire - Nom";"Bénéficiaire - Prénom";"Id Auxiliaire";"Auxiliaire - Titre";"Auxiliaire - Nom";"Auxiliaire - Prénom";"Date de début";"Date de fin"',
      `${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";${auxiliaryList[0]._id.toHexString()};"M.";"UIUI";"Lulu";"31/01/2020";`,
      `${customersList[0]._id.toHexString()};"M.";"FROOME";"Christopher";${auxiliaryList[1]._id.toHexString()};"M.";"LOLO";"Lili";"12/03/2019";"30/01/2020"`,
      `${customersList[1]._id.toHexString()};"M.";"BERNAL";"Egan";${auxiliaryList[0]._id.toHexString()};"M.";"UIUI";"Lulu";"23/06/2019";`,
    ],
  },
];

dataExportTypes.forEach(({ exportType, expectedRows }) => {
  describe(`GET /exports/${exportType}/data`, () => {
    let authToken;
    before(populateDB);

    describe('COACH', () => {
      beforeEach(async () => {
        authToken = await getToken('coach');
      });

      it(`should get ${exportType}`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/exports/${exportType}/data`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);

        const rows = response.result.split('\r\n');
        expect(rows.length).toBe(expectedRows.length);

        for (let i = 0; i < expectedRows.length; i++) expect(rows.some(r => r === expectedRows[i])).toBeTruthy();
      });
    });

    describe('Other roles', () => {
      const roles = [
        { name: 'helper', expectedCode: 403 },
        { name: 'planning_referent', expectedCode: 403 },
        { name: 'vendor_admin', expectedCode: 403 },
        { name: 'client_admin', expectedCode: 403, erp: false },
      ];
      roles.forEach((role) => {
        it(`should return ${role.expectedCode} as user is ${role.name}${role.erp ? '' : ' without erp'}`, async () => {
          authToken = await getToken(role.name, role.erp);
          const response = await app.inject({
            method: 'GET',
            url: `/exports/${exportType}/data`,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(role.expectedCode);
        });
      });
    });
  });
});
