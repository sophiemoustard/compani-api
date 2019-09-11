const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
require('sinon-mongoose');

const Customer = require('../../../models/Customer');
const Bill = require('../../../models/Bill');
const CreditNote = require('../../../models/CreditNote');
const Contract = require('../../../models/Contract');
const ExportHelper = require('../../../helpers/export');
const UtilsHelper = require('../../../helpers/utils');
const EventRepository = require('../../../repositories/EventRepository');

describe('exportWorkingEventsHistory', () => {
  const header = ['Type', 'Heure interne', 'Service', 'Début', 'Fin', 'Durée', 'Répétition', 'Équipe', 'Auxiliaire - Titre', 'Auxiliaire - Prénom', 'Auxiliaire - Nom', 'A affecter', 'Bénéficiaire - Titre', 'Bénéficiaire - Nom', 'Bénéficiaire - Prénom', 'Divers', 'Facturé', 'Annulé', 'Statut de l\'annulation', 'Raison de l\'annulation'];
  const events = [
    {
      isCancelled: false,
      isBilled: true,
      type: 'intervention',
      repetition: { frequency: 'every_week' },
      sector: { name: 'Girafes - 75' },
      subscription: {
        service: { versions: [{ name: 'Lala' }] },
      },
      customer: {
        identity: {
          title: 'Mme',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      auxiliary: {
        identity: {
          firstname: 'Jean-Claude',
          lastname: 'Van Damme',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
    }, {
      isCancelled: true,
      cancel: {
        condition: 'invoiced_and_not_payed',
        reason: 'auxiliary_initiative',
      },
      isBilled: false,
      type: 'internalHour',
      internalHour: { name: 'Formation' },
      repetition: { frequency: 'never' },
      sector: { name: 'Etoiles - 75' },
      customer: {
        identity: {
          title: 'M',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
      misc: 'brbr',
    },
  ];
  let getWorkingEventsForExport;
  let getLastVersion;
  beforeEach(() => {
    getWorkingEventsForExport = sinon.stub(EventRepository, 'getWorkingEventsForExport');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
  });
  afterEach(() => {
    getWorkingEventsForExport.restore();
    getLastVersion.restore();
  });

  it('should return an array containing just the header', async () => {
    getWorkingEventsForExport.returns([]);
    const exportArray = await ExportHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getWorkingEventsForExport.returns(events);
    getLastVersion.callsFake(ver => ver[0]);

    const exportArray = await ExportHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Intervention', '', 'Lala', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', 'Une fois par semaine', 'Girafes - 75', '', 'Jean-Claude', 'VAN DAMME', 'Non', 'Mme', 'MATHY', 'Mimi', '', 'Oui', 'Non', '', ''],
      ['Heure interne', 'Formation', '', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', '', 'Etoiles - 75', '', '', '', 'Oui', 'M', 'HORSEMAN', 'Bojack', 'brbr', 'Non', 'Oui', 'Facturée & non payée', 'Initiative du de l\'intervenant'],
    ]);
  });
});

describe('exportAbsencesHistory', () => {
  const header = ['Type', 'Nature', 'Début', 'Fin', 'Équipe', 'Auxiliaire - Titre', 'Auxiliaire - Prénom', 'Auxiliaire - Nom', 'Divers'];
  const events = [
    {
      type: 'absence',
      absence: 'unjustified absence',
      absenceNature: 'hourly',
      sector: { name: 'Girafes - 75' },
      auxiliary: {
        identity: {
          firstname: 'Jean-Claude',
          lastname: 'Van Damme',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
    }, {
      type: 'absence',
      absence: 'leave',
      absenceNature: 'daily',
      internalHour: { name: 'Formation' },
      sector: { name: 'Etoiles - 75' },
      auxiliary: {
        identity: {
          firstname: 'Princess',
          lastname: 'Carolyn',
        },
      },
      startDate: '2019-05-20T06:00:00.000+00:00',
      endDate: '2019-05-20T08:00:00.000+00:00',
      misc: 'brbr',
    },
  ];
  let getAbsencesForExport;
  beforeEach(() => {
    getAbsencesForExport = sinon.stub(EventRepository, 'getAbsencesForExport');
  });
  afterEach(() => {
    getAbsencesForExport.restore();
  });

  it('should return an array containing just the header', async () => {
    getAbsencesForExport.returns([]);
    const exportArray = await ExportHelper.exportAbsencesHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getAbsencesForExport.returns(events);

    const exportArray = await ExportHelper.exportAbsencesHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Absence injustifiée', 'Horaire', '20/05/2019 08:00', '20/05/2019 10:00', 'Girafes - 75', '', 'Jean-Claude', 'VAN DAMME', ''],
      ['Congé', 'Journalière', '20/05/2019', '20/05/2019', 'Etoiles - 75', '', 'Princess', 'CAROLYN', 'brbr'],
    ]);
  });
});

describe('exportBillsAndCreditNotesHistory', () => {
  const header = ['Nature', 'Identifiant', 'Date', 'Id Bénéficiaire', 'Titre', 'Nom', 'Prénom', 'Id tiers payeur', 'Tiers payeur', 'Montant HT en €', 'Montant TTC en €', 'Services'];
  const bills = [
    {
      number: 'FACT-0549236',
      date: '2019-05-20T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a4fb00997363eb3'),
        identity: {
          title: 'Mme',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      client: { _id: ObjectID('5c35b5eb7e0fb87297363eb2'), name: 'TF1' },
      netInclTaxes: 389276.023,
      subscriptions: [{
        service: { name: 'Temps de qualité - autonomie' },
        hours: 20,
        exclTaxes: 389276.0208,
        inclTaxes: 410686.201944,
      }],
    }, {
      number: 'FACT-0419457',
      date: '2019-05-22T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a6fb02397363eb1'),
        identity: {
          title: 'M',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      client: { _id: ObjectID('5c35b5eb1a6fb87297363eb2'), name: 'The Sherif' },
      netInclTaxes: 1057.1319439,
      subscriptions: [{
        service: { name: 'Forfait nuit' },
        hours: 15,
        exclTaxes: 700.0208,
        inclTaxes: 738.521944,
      }, {
        service: { name: 'Forfait nuit' },
        hours: 7,
        inclTaxes: 302,
        exclTaxes: 318.6099999,
      }],
    },
  ];
  const creditNotes = [
    {
      number: 'F1501231',
      thirdPartyPayer: { _id: new ObjectID('5d761ad7ffd1dc0d39dadd7e'), name: 'SW' },
      date: '2019-05-21T01:00:00.000+00:00',
      customer: {
        _id: new ObjectID('5d761a8f6f6cba0d259b17eb'),
        identity: {
          firstname: 'Jar jar',
          lastname: 'Binks',
        },
      },
      subscription: { service: { name: 'Temps de qualité - autonomie' } },
      exclTaxesCustomer: 10.5,
      inclTaxesCustomer: 5.5,
      exclTaxesTpp: 8,
      inclTaxesTpp: 3,
    },
    {
      number: 'F6473250',
      date: '2019-05-25T02:00:00.000+00:00',
      customer: {
        _id: new ObjectID('5d761a8f6f8eba0d259b173f'),
        identity: {
          lastname: 'R2D2',
        },
      },
      subscription: { service: { name: 'Temps de qualité - autonomie' } },
      exclTaxesCustomer: 10.5,
      inclTaxesCustomer: 5.5,
    },
  ];
  let mockBill;
  let mockCreditNote;
  let formatPriceStub;
  let formatFloatForExportStub;

  beforeEach(() => {
    mockBill = sinon.mock(Bill);
    mockCreditNote = sinon.mock(CreditNote);
    formatPriceStub = sinon.stub(UtilsHelper, 'formatPrice');
    formatFloatForExportStub = sinon.stub(UtilsHelper, 'formatFloatForExport');
  });
  afterEach(() => {
    mockBill.restore();
    mockCreditNote.restore();
    formatPriceStub.restore();
    formatFloatForExportStub.restore();
  });

  it('should return an array containing just the header', async () => {
    mockBill.expects('find').chain('lean').returns([]);
    mockCreditNote.expects('find').chain('lean').returns([]);
    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null);

    expect(exportArray).toEqual([header]);

    mockBill.verify();
    mockCreditNote.verify();
  });

  it('should return an array with the header and a row of empty cells', async () => {
    mockBill.expects('find').chain('lean').returns([{}]);
    mockCreditNote.expects('find').chain('lean').returns([{}]);

    formatPriceStub.callsFake(price => (price ? `P-${price}` : ''));
    formatFloatForExportStub.callsFake(float => (float ? `F-${float}` : ''));
    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Facture', '', '', '', '', '', '', '', '', '', '', ''],
      ['Avoir', '', '', '', '', '', '', '', '', '', '', ''],
    ]);

    mockBill.verify();
    mockCreditNote.verify();
  });

  it('should return an array with the header and 2 rows', async () => {
    mockBill.expects('find')
      .chain('sort')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(bills);
    mockCreditNote.expects('find')
      .chain('sort')
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(creditNotes);

    formatPriceStub.callsFake(price => (price ? `P-${price}` : ''));
    formatFloatForExportStub.callsFake(float => (float ? `F-${float}` : ''));

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null);

    sinon.assert.callCount(formatPriceStub, 3);
    sinon.assert.callCount(formatFloatForExportStub, 8);
    expect(exportArray).toEqual([
      header,
      ['Facture', 'FACT-0549236', '20/05/2019', '5c35b5eb1a4fb00997363eb3', 'Mme', 'MATHY', 'Mimi', '5c35b5eb7e0fb87297363eb2', 'TF1', 'F-389276.0208', 'F-389276.023', 'Temps de qualité - autonomie - 20 heures - P-410686.201944 TTC'],
      ['Facture', 'FACT-0419457', '22/05/2019', '5c35b5eb1a6fb02397363eb1', 'M', 'HORSEMAN', 'Bojack', '5c35b5eb1a6fb87297363eb2', 'The Sherif', 'F-1018.6307999', 'F-1057.1319439', 'Forfait nuit - 15 heures - P-738.521944 TTC\r\nForfait nuit - 7 heures - P-302 TTC'],
      ['Avoir', 'F1501231', '21/05/2019', '5d761a8f6f6cba0d259b17eb', '', 'BINKS', 'Jar jar', '5d761ad7ffd1dc0d39dadd7e', 'SW', 'F-18.5', 'F-8.5', 'Temps de qualité - autonomie'],
      ['Avoir', 'F6473250', '25/05/2019', '5d761a8f6f8eba0d259b173f', '', 'R2D2', '', '', '', 'F-10.5', 'F-5.5', 'Temps de qualité - autonomie'],
    ]);

    mockBill.verify();
    mockCreditNote.verify();
  });
});

describe('exportContractHistory', () => {
  const startDate = '2019-10-01T09:00:00';
  const endDate = '2019-11-01T09:00:00';
  let contractMock;
  beforeEach(() => {
    contractMock = sinon.mock(Contract);
  });
  afterEach(() => {
    contractMock.restore();
  });

  it('should return an array containing just the header', async () => {
    contractMock.expects('find')
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);

    const result = await ExportHelper.exportContractHistory(startDate, endDate);
    contractMock.verify();
    expect(result).toEqual([['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire']]);
  });

  it('should return an array containing the header and one row', async () => {
    const contracts = [{ versions: [{ startDate: '2019-10-10T00:00:00' }] }];
    contractMock.expects('find')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(contracts);

    const result = await ExportHelper.exportContractHistory(startDate, endDate);
    contractMock.verify();
    expect(result).toEqual([
      ['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', '', '', '', '10/10/2019', '', '', ''],
    ]);
  });

  it('should return an array with the header and 2 rows', async () => {
    const contracts = [
      {
        user: { identity: { title: 'M', lastname: 'Patate' } },
        versions: [
          { startDate: '2019-10-10T00:00:00', weeklyHours: 12, grossHourlyRate: 10.45 },
        ],
      },
      {
        user: { identity: { title: 'Mme', firstname: 'Patate' } },
        versions: [
          { startDate: '2019-09-08T00:00:00', endDate: '2019-10-07T00:00:00', weeklyHours: 10, grossHourlyRate: 10 },
          { startDate: '2019-10-08T00:00:00', endDate: '2019-11-07T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
          { startDate: '2019-11-08T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
        ],
      },
    ];

    contractMock.expects('find').chain('populate').chain('lean').returns(contracts);

    const result = await ExportHelper.exportContractHistory(startDate, endDate);
    expect(result).toEqual([
      ['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', 'M', '', 'Patate', '10/10/2019', '', '10,45', 12],
      ['Avenant', 'Mme', 'Patate', '', '08/10/2019', '07/11/2019', '2,00', 14],
    ]);
  });
});

describe('exportCustomers', () => {
  let CustomerModel;
  let getLastVersion;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    CustomerModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Titre', 'Nom', 'Prenom', 'Date de naissance', 'Adresse', 'Environnement', 'Objectifs',
      'Autres', 'Référente', 'Nom associé au compte bancaire', 'IBAN', 'BIC', 'RUM', 'Date de signature du mandat', 'Nombre de souscriptions', 'Souscriptions',
      'Nombre de financements', 'Date de création']);
  });

  it('should return customer email', async () => {
    const customers = [
      { email: 'papi@mamie.pp' },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['papi@mamie.pp', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer identity', async () => {
    const customers = [
      { identity: { lastname: 'Papi', firstname: 'Grand Père', title: 'M', birthDate: '1919-12-12T00:00:00.000+00:00' } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'M', 'PAPI', 'Grand Père', '12/12/1919', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return empty strings if customer identity missing', async () => {
    const customers = [
      { identity: { lastname: 'Papi', title: 'M' } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'M', 'PAPI', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer address', async () => {
    const customers = [
      { contact: { address: { fullAddress: '9 rue du paradis 70015 Paris' } } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '9 rue du paradis 70015 Paris', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return empty strings if customer address missing', async () => {
    const customers = [
      { contact: { address: {} } },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer followUp', async () => {
    const customers = [
      {
        followUp: {
          misc: 'Lala', objectives: 'Savate et charentaises', environment: 'Père Castor', referent: 'Moi',
        },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', 'Père Castor', 'Savate et charentaises', 'Lala', 'Moi',
      '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return empty strings if customer followUp missing', async () => {
    const customers = [
      {
        followUp: { misc: 'Lala', environment: 'Père Castor', referent: 'Moi' },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', 'Père Castor', '', 'Lala', 'Moi', '', '', '', '', '', 0, '', 0, '']);
  });

  it('should return customer payment', async () => {
    const customers = [
      {
        payment: {
          bankAccountOwner: 'Lui',
          iban: 'Boom Ba Da Boom',
          bic: 'bic bic',
          mandates: [{ rum: 'Grippe et rhume', signedAt: '2012-12-12T00:00:00.000+00:00' }],
        },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', 'Lui', 'Boom Ba Da Boom', 'bic bic', 'Grippe et rhume',
      '12/12/2012', 0, '', 0, '']);
  });

  it('should return empty strings if customer payment missing', async () => {
    const customers = [
      {
        payment: {
          bankAccountOwner: 'Lui',
          bic: 'bic bic',
          mandates: [{ rum: 'Grippe et rhume' }],
        },
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', 'Lui', '', 'bic bic', 'Grippe et rhume', '', 0, '', 0, '']);
  });

  it('should return customer subscription count and service list name', async () => {
    const customers = [
      {
        subscriptions: [
          { service: { versions: [{ name: 'Au service de sa majesté' }] } },
          { service: { versions: [{ name: 'Service public' }] } },
          { service: { versions: [{ name: 'Service civique' }] } },
        ],
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 3,
      'Au service de sa majesté\r\n Service public\r\n Service civique', 0, '']);
  });

  it('should return customer funding count', async () => {
    const customers = [
      {
        fundings: [
          { _id: 'toto' },
          { _id: 'lala' },
        ],
      },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 2, '']);
  });

  it('should return customer creation date', async () => {
    const customers = [
      { createdAt: '2012-12-12T00:00:00.000+00:00' },
    ];
    CustomerModel.expects('find')
      .withExactArgs()
      .chain('populate')
      .once()
      .returns(customers);

    const result = await UtilsHelper.exportCustomers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '12/12/2012']);
  });
});
