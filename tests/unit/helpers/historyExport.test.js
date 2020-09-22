/* eslint-disable max-len */
const { ObjectID } = require('mongodb');
const moment = require('moment');
const expect = require('expect');
const sinon = require('sinon');
require('sinon-mongoose');
const Bill = require('../../../src/models/Bill');
const CreditNote = require('../../../src/models/CreditNote');
const Contract = require('../../../src/models/Contract');
const Pay = require('../../../src/models/Pay');
const Payment = require('../../../src/models/Payment');
const FinalPay = require('../../../src/models/FinalPay');
const ExportHelper = require('../../../src/helpers/historyExport');
const UtilsHelper = require('../../../src/helpers/utils');
const EventRepository = require('../../../src/repositories/EventRepository');
const UserRepository = require('../../../src/repositories/UserRepository');

describe('exportWorkingEventsHistory', () => {
  const header = [
    'Type',
    'Heure interne',
    'Service',
    'Début',
    'Fin',
    'Durée',
    'Répétition',
    'Équipe',
    'Id Auxiliaire',
    'Auxiliaire - Titre',
    'Auxiliaire - Prénom',
    'Auxiliaire - Nom',
    'A affecter',
    'Id Bénéficiaire',
    'Bénéficiaire - Titre',
    'Bénéficiaire - Nom',
    'Bénéficiaire - Prénom',
    'Divers',
    'Facturé',
    'Annulé',
    'Statut de l\'annulation',
    'Raison de l\'annulation',
  ];
  const auxiliaryId = new ObjectID();
  const auxiliaries = [
    {
      _id: auxiliaryId,
      identity: { firstname: 'Jean-Claude', lastname: 'Van Damme' },
      sectorHistory: [
        { startDate: '2018-09-12T00:00:00', sector: { name: 'Girafes - 75' } },
        { startDate: '2019-09-12T00:00:00', sector: { name: 'Etoiles - 75' } },
      ],
    },
  ];
  const events = [
    {
      isCancelled: false,
      isBilled: true,
      type: 'intervention',
      repetition: { frequency: 'every_week' },
      subscription: {
        service: { versions: [{ name: 'Lala' }] },
      },
      customer: {
        _id: new ObjectID(),
        identity: { title: 'mrs', firstname: 'Mimi', lastname: 'Mathy' },
      },
      auxiliary: auxiliaryId,
      startDate: moment('2019-05-20T08:00:00').toDate(),
      endDate: moment('2019-05-20T10:00:00').toDate(),
    },
    {
      isCancelled: false,
      isBilled: true,
      type: 'intervention',
      repetition: { frequency: 'every_week' },
      subscription: {
        service: { versions: [{ name: 'Lala' }] },
      },
      customer: {
        _id: new ObjectID(),
        identity: { title: 'mrs', firstname: 'Mimi', lastname: 'Mathy' },
      },
      sector: { name: 'Girafes - 75' },
      startDate: moment('2019-05-20T08:00:00').toDate(),
      endDate: moment('2019-05-20T10:00:00').toDate(),
    },
    {
      isCancelled: true,
      cancel: { condition: 'invoiced_and_not_paid', reason: 'auxiliary_initiative' },
      isBilled: false,
      type: 'internalHour',
      internalHour: { name: 'Formation' },
      repetition: { frequency: 'never' },
      sector: { name: 'Etoiles - 75' },
      customer: {
        _id: new ObjectID(),
        identity: { title: 'mr', firstname: 'Bojack', lastname: 'Horseman' },
      },
      startDate: moment('2019-05-20T08:00:00').toDate(),
      endDate: moment('2019-05-20T10:00:00').toDate(),
      misc: 'brbr',
    },
  ];
  let getWorkingEventsForExport;
  let getLastVersion;
  let getAuxiliariesWithSectorHistory;
  beforeEach(() => {
    getWorkingEventsForExport = sinon.stub(EventRepository, 'getWorkingEventsForExport');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion');
    getAuxiliariesWithSectorHistory = sinon.stub(UserRepository, 'getAuxiliariesWithSectorHistory');
  });
  afterEach(() => {
    getWorkingEventsForExport.restore();
    getLastVersion.restore();
    getAuxiliariesWithSectorHistory.restore();
  });

  it('should return an array containing just the header', async () => {
    getWorkingEventsForExport.returns([]);
    getAuxiliariesWithSectorHistory.returns([]);
    const exportArray = await ExportHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    getWorkingEventsForExport.returns(events);
    getAuxiliariesWithSectorHistory.returns(auxiliaries);
    getLastVersion.callsFake(ver => ver[0]);

    const exportArray = await ExportHelper.exportWorkingEventsHistory(null, null);

    expect(exportArray).toEqual([
      header,
      ['Intervention', '', 'Lala', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', 'Une fois par semaine',
        'Girafes - 75', expect.any(ObjectID), '', 'Jean-Claude', 'VAN DAMME', 'Non', expect.any(ObjectID), 'Mme',
        'MATHY', 'Mimi', '', 'Oui', 'Non', '', ''],
      ['Intervention', '', 'Lala', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', 'Une fois par semaine',
        'Girafes - 75', '', '', '', '', 'Oui', expect.any(ObjectID), 'Mme', 'MATHY', 'Mimi', '',
        'Oui', 'Non', '', ''],
      ['Heure interne', 'Formation', '', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', '', 'Etoiles - 75',
        '', '', '', '', 'Oui', expect.any(ObjectID), 'M.', 'HORSEMAN', 'Bojack', 'brbr', 'Non', 'Oui',
        'Facturée & non payée',
        'Initiative de l\'intervenant'],
    ]);
  });
});

describe('exportAbsencesHistory', () => {
  const header = [
    'Id Auxiliaire',
    'Auxiliaire - Prénom',
    'Auxiliaire - Nom',
    'Auxiliaire - Titre',
    'Équipe',
    'Type',
    'Nature',
    'Début',
    'Fin',
    'Divers',
  ];
  const events = [
    {
      type: 'absence',
      absence: 'unjustified absence',
      absenceNature: 'hourly',
      auxiliary: {
        _id: new ObjectID(),
        identity: { firstname: 'Jean-Claude', lastname: 'Van Damme' },
        sector: { name: 'Girafes - 75' },
      },
      startDate: moment('2019-05-20T08:00:00').toDate(),
      endDate: moment('2019-05-20T10:00:00').toDate(),
    },
    {
      type: 'absence',
      absence: 'leave',
      absenceNature: 'daily',
      internalHour: { name: 'Formation' },
      auxiliary: {
        _id: new ObjectID(),
        identity: { firstname: 'Princess', lastname: 'Carolyn' },
        sector: { name: 'Etoiles - 75' },
      },
      startDate: moment('2019-05-20T08:00:00').toDate(),
      endDate: moment('2019-05-20T10:00:00').toDate(),
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
    const credentials = { company: { _id: '1234567890' } };
    getAbsencesForExport.returns([]);
    const exportArray = await ExportHelper.exportAbsencesHistory(null, null, credentials);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    const credentials = { company: { _id: '1234567890' } };
    getAbsencesForExport.returns(events);

    const exportArray = await ExportHelper.exportAbsencesHistory(null, null, credentials);

    expect(exportArray).toEqual([
      header,
      [expect.any(ObjectID), 'Jean-Claude', 'VAN DAMME', '', 'Girafes - 75', 'Absence injustifiée', 'Horaire',
        '20/05/2019 08:00', '20/05/2019 10:00', ''],
      [expect.any(ObjectID), 'Princess', 'CAROLYN', '', 'Etoiles - 75', 'Congé', 'Journalière', '20/05/2019',
        '20/05/2019', 'brbr'],
    ]);
  });
});

describe('exportBillsAndCreditNotesHistory', () => {
  const header = [
    'Nature',
    'Identifiant',
    'Date',
    'Id Bénéficiaire',
    'Titre',
    'Nom',
    'Prénom',
    'Id tiers payeur',
    'Tiers payeur',
    'Montant HT en €',
    'Montant TTC en €',
    'Nombre d\'heures',
    'Services',
    'Date de création',
  ];
  const bills = [
    {
      number: 'FACT-0549236',
      date: '2019-05-20T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a4fb00997363eb3'),
        identity: { title: 'mrs', firstname: 'Mimi', lastname: 'Mathy' },
      },
      thirdPartyPayer: { _id: ObjectID('5c35b5eb7e0fb87297363eb2'), name: 'TF1' },
      netInclTaxes: 389276.023,
      subscriptions: [
        {
          service: { name: 'Temps de qualité - autonomie' },
          hours: 20,
          exclTaxes: 389276.0208,
          inclTaxes: 410686.201944,
        },
      ],
      createdAt: '2019-10-11',
    },
    {
      number: 'FACT-0419457',
      date: '2019-05-22T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a6fb02397363eb1'),
        identity: {
          title: 'mr',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      thirdPartyPayer: { _id: ObjectID('5c35b5eb1a6fb87297363eb2'), name: 'The Sherif' },
      netInclTaxes: 1057.1319439,
      subscriptions: [
        {
          service: { name: 'Forfait nuit' },
          hours: 15,
          exclTaxes: 700.0208,
          inclTaxes: 738.521944,
        },
        {
          service: { name: 'Forfait nuit' },
          hours: 7,
          inclTaxes: 302,
          exclTaxes: 318.6099999,
        },
      ],
      createdAt: '2019-10-12',
    },
  ];
  const creditNotes = [
    {
      number: 'F1501231',
      thirdPartyPayer: { _id: new ObjectID('5d761ad7ffd1dc0d39dadd7e'), name: 'SW' },
      date: '2019-05-21T01:00:00.000+00:00',
      customer: {
        _id: new ObjectID('5d761a8f6f6cba0d259b17eb'),
        identity: { firstname: 'Jar jar', lastname: 'Binks' },
      },
      subscription: { service: { name: 'Temps de qualité - autonomie' } },
      exclTaxesCustomer: 10.5,
      inclTaxesCustomer: 5.5,
      exclTaxesTpp: 8,
      inclTaxesTpp: 3,
      createdAt: '2019-10-15',
    },
    {
      number: 'F6473250',
      date: '2019-05-25T02:00:00.000+00:00',
      customer: {
        _id: new ObjectID('5d761a8f6f8eba0d259b173f'),
        identity: { lastname: 'R2D2' },
      },
      subscription: { service: { name: 'Temps de qualité - autonomie' } },
      exclTaxesCustomer: 10.5,
      inclTaxesCustomer: 5.5,
      createdAt: '2019-10-16',
    },
  ];
  const credentials = { company: { _id: new ObjectID() } };
  const findQuery = {
    date: { $lte: null, $gte: null },
    company: credentials.company._id,
  };
  const sortQuery = { date: 'desc' };
  const populateCustomerQuery = { path: 'customer', select: 'identity' };
  let mockBill;
  let mockCreditNote;
  let formatPriceStub;
  let formatHourStub;
  let formatFloatForExportStub;

  beforeEach(() => {
    mockBill = sinon.mock(Bill);
    mockCreditNote = sinon.mock(CreditNote);
    formatPriceStub = sinon.stub(UtilsHelper, 'formatPrice');
    formatHourStub = sinon.stub(UtilsHelper, 'formatHour');
    formatFloatForExportStub = sinon.stub(UtilsHelper, 'formatFloatForExport');
  });
  afterEach(() => {
    mockBill.restore();
    mockCreditNote.restore();
    formatPriceStub.restore();
    formatHourStub.restore();
    formatFloatForExportStub.restore();
  });

  it('should return an array containing just the header', async () => {
    mockBill.expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .returns([]);
    mockCreditNote.expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .returns([]);

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null, credentials);

    expect(exportArray).toEqual([header]);
    mockBill.verify();
    mockCreditNote.verify();
  });

  it('should return an array with the header and a row of empty cells', async () => {
    mockBill.expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .returns([{}]);
    mockCreditNote.expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .returns([{}]);
    formatPriceStub.callsFake(price => (price ? `P-${price}` : ''));
    formatHourStub.callsFake(hour => (hour ? `${hour}h` : ''));
    formatFloatForExportStub.callsFake(float => (float ? `F-${float}` : ''));

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null, credentials);

    expect(exportArray).toEqual([
      header,
      ['Facture', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Avoir', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
    mockBill.verify();
    mockCreditNote.verify();
    sinon.assert.callCount(formatPriceStub, 0);
    sinon.assert.callCount(formatHourStub, 0);
    sinon.assert.callCount(formatFloatForExportStub, 4);
  });

  it('should return an array with the header and 2 rows', async () => {
    mockBill
      .expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .returns(bills);
    mockCreditNote
      .expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('thirdPartyPayer')
      .chain('lean')
      .returns(creditNotes);
    formatPriceStub.callsFake(price => (price ? `P-${price}` : ''));
    formatHourStub.callsFake(hour => (hour ? `${hour}h` : ''));
    formatFloatForExportStub.callsFake(float => (float ? `F-${float}` : ''));

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null, credentials);

    sinon.assert.callCount(formatPriceStub, 3);
    sinon.assert.callCount(formatFloatForExportStub, 10);
    sinon.assert.callCount(formatHourStub, 3);
    expect(exportArray).toEqual([
      header,
      [
        'Facture',
        'FACT-0549236',
        '20/05/2019',
        '5c35b5eb1a4fb00997363eb3',
        'Mme',
        'MATHY',
        'Mimi',
        '5c35b5eb7e0fb87297363eb2',
        'TF1',
        'F-389276.0208',
        'F-389276.023',
        'F-20',
        'Temps de qualité - autonomie - 20h - P-410686.201944 TTC',
        '11/10/2019',
      ],
      [
        'Facture',
        'FACT-0419457',
        '22/05/2019',
        '5c35b5eb1a6fb02397363eb1',
        'M.',
        'HORSEMAN',
        'Bojack',
        '5c35b5eb1a6fb87297363eb2',
        'The Sherif',
        'F-1018.6307999',
        'F-1057.1319439',
        'F-22',
        'Forfait nuit - 15h - P-738.521944 TTC\r\nForfait nuit - 7h - P-302 TTC',
        '12/10/2019',
      ],
      [
        'Avoir',
        'F1501231',
        '21/05/2019',
        '5d761a8f6f6cba0d259b17eb',
        '',
        'BINKS',
        'Jar jar',
        '5d761ad7ffd1dc0d39dadd7e',
        'SW',
        'F-18.5',
        'F-8.5',
        '',
        'Temps de qualité - autonomie',
        '15/10/2019',
      ],
      [
        'Avoir',
        'F6473250',
        '25/05/2019',
        '5d761a8f6f8eba0d259b173f',
        '',
        'R2D2',
        '',
        '',
        '',
        'F-10.5',
        'F-5.5',
        '',
        'Temps de qualité - autonomie',
        '16/10/2019',
      ],
    ]);
    mockBill.verify();
    mockCreditNote.verify();
    sinon.assert.callCount(formatHourStub, 3);
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
    const credentials = { company: { _id: '1234567890' } };
    contractMock
      .expects('find')
      .withExactArgs({ company: '1234567890', 'versions.startDate': { $lte: endDate, $gte: startDate } })
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);

    const result = await ExportHelper.exportContractHistory(startDate, endDate, credentials);
    contractMock.verify();
    expect(result).toEqual([[
      'Type',
      'Id Auxiliaire',
      'Titre',
      'Prénom',
      'Nom',
      'Date de début',
      'Date de fin',
      'Taux horaire',
      'Volume horaire hebdomadaire',
    ]]);
  });

  it('should return an array containing the header and one row', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const contracts = [{ versions: [{ startDate: '2019-10-10T00:00:00' }], user: { _id: new ObjectID() } }];
    contractMock.expects('find')
      .withExactArgs({ company: '1234567890', 'versions.startDate': { $lte: endDate, $gte: startDate } })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(contracts);

    const result = await ExportHelper.exportContractHistory(startDate, endDate, credentials);
    contractMock.verify();
    expect(result).toEqual([
      ['Type', 'Id Auxiliaire', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', contracts[0].user._id, '', '', '', '10/10/2019', '', '', ''],
    ]);
  });

  it('should return an array with the header and 2 rows', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const contracts = [
      {
        user: { identity: { title: 'mr', lastname: 'Patate' }, _id: new ObjectID() },
        versions: [{ startDate: '2019-10-10T00:00:00', weeklyHours: 12, grossHourlyRate: 10.45 }],
      },
      {
        user: { identity: { title: 'mrs', firstname: 'Patate' }, _id: new ObjectID() },
        versions: [
          { startDate: '2019-09-08T00:00:00', endDate: '2019-10-07T00:00:00', weeklyHours: 10, grossHourlyRate: 10 },
          { startDate: '2019-10-08T00:00:00', endDate: '2019-11-07T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
          { startDate: '2019-11-08T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
        ],
      },
    ];

    contractMock
      .expects('find')
      .withExactArgs({ company: '1234567890', 'versions.startDate': { $lte: endDate, $gte: startDate } })
      .chain('populate')
      .chain('lean')
      .returns(contracts);

    const result = await ExportHelper.exportContractHistory(startDate, endDate, credentials);
    expect(result).toEqual([
      ['Type', 'Id Auxiliaire', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', contracts[0].user._id, 'M.', '', 'Patate', '10/10/2019', '', '10,45', 12],
      ['Avenant', contracts[1].user._id, 'Mme', 'Patate', '', '08/10/2019', '07/11/2019', '2,00', 14],
    ]);
    contractMock.verify();
  });
});

describe('formatSurchargedDetailsForExport', () => {
  const emptyPlan = { planName: 'Empty plan' };
  const unknownPlan = { planName: 'Unknown plan', helloWorld: { percentage: 7, hours: 10 } };
  const onePlan = {
    plan: [{
      planName: 'Small plan',
      sunday: { percentage: 28, hours: 11 },
      evening: { percentage: 17, hours: 12 },
      custom: { percentage: 8, hours: 13 },
    }],
  };
  const onePlanWithDiff = {
    plan: [{
      planName: 'Small plan',
      sunday: { percentage: 28, hours: 11 },
      evening: { percentage: 17, hours: 12 },
      custom: { percentage: 8, hours: 13 },
    }],
    diff: {
      plan: [{
        planName: 'Full plan',
        saturday: { percentage: 20, hours: 1.12543 },
        sunday: { percentage: 30, hours: 2.2 },
        publicHoliday: { percentage: 25, hours: 3 },
        twentyFifthOfDecember: { percentage: 35, hours: 4 },
      }],
    },
  };
  const multiplePlans = {
    plan: [
      {
        planName: 'Small plan',
        sunday: { percentage: 28, hours: 11 },
        evening: { percentage: 17, hours: 12 },
        custom: { percentage: 8, hours: 13 },
      },
      { planName: 'Unknown plan', helloWorld: { percentage: 7, hours: 10 } },
      { planName: 'Empty plan' },
      {
        planName: 'Full plan',
        saturday: { percentage: 20, hours: 1.12543 },
        sunday: { percentage: 30, hours: 2.2 },
        publicHoliday: { percentage: 25, hours: 3 },
        twentyFifthOfDecember: { percentage: 35, hours: 4 },
        firstOfMay: { percentage: 32, hours: 5 },
        evening: { percentage: 15, hours: 6 },
        custom: { percentage: 5, hours: 7 },
      },
    ],
  };

  let formatFloatForExportStub;

  beforeEach(() => {
    formatFloatForExportStub = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExportStub.callsFake(nb => Number(nb).toFixed(2));
  });

  afterEach(() => {
    formatFloatForExportStub.restore();
  });

  it('should returns an empty string if no arg is provided', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport();
    sinon.assert.notCalled(formatFloatForExportStub);
    expect(result).toBe('');
  });

  it('should returns an empty string if there are no details', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport([]);
    expect(result).toBe('');
  });

  it('should returns an empty string if the plan is empty', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport([emptyPlan]);
    expect(result).toBe('');
  });

  it('should returns an empty string if the plan has unknown surcharges', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport([unknownPlan]);
    expect(result).toBe('');
  });

  it('should returns a plan\'s details if one is provided', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport(onePlan, 'plan');
    sinon.assert.callCount(formatFloatForExportStub, 3);
    expect(result).toBe('Small plan\r\nDimanche, 28%, 11.00h\r\nSoirée, 17%, 12.00h\r\nPersonnalisée, 8%, 13.00h');
  });

  it('should returns a plan\'s detailswithDiff', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport(onePlanWithDiff, 'plan');
    sinon.assert.callCount(formatFloatForExportStub, 7);
    expect(result).toBe('Small plan\r\nDimanche, 28%, 11.00h\r\nSoirée, 17%, 12.00h\r\nPersonnalisée, 8%, 13.00h\r\n\r\nFull plan (M-1)\r\nSamedi, 20%, 1.13h\r\nDimanche, 30%, 2.20h\r\nJours fériés, 25%, 3.00h\r\n25 décembre, 35%, 4.00h');
  });

  it('should returns all the details if several plans are provided', () => {
    const result = ExportHelper.formatSurchargedDetailsForExport(multiplePlans, 'plan');
    sinon.assert.callCount(formatFloatForExportStub, 10);
    expect(result).toBe('Small plan\r\nDimanche, 28%, 11.00h\r\nSoirée, 17%, 12.00h\r\nPersonnalisée, 8%, 13.00h\r\n\r\nFull plan\r\nSamedi, 20%, 1.13h\r\nDimanche, 30%, 2.20h\r\nJours fériés, 25%, 3.00h\r\n25 décembre, 35%, 4.00h\r\n1er mai, 32%, 5.00h\r\nSoirée, 15%, 6.00h\r\nPersonnalisée, 5%, 7.00h');
  });
});

describe('exportPayAndFinalPayHistory', () => {
  const header = [
    'Id Auxiliaire',
    'Titre',
    'Prénom',
    'Nom',
    'Equipe',
    'Date d\'embauche',
    'Début',
    'Date de notif',
    'Motif',
    'Fin',
    'Heures contrat',
    'Heures à travailler',
    'Heures travaillées',
    'Dont exo non majo',
    'Dont exo et majo',
    'Détails des majo exo',
    'Dont non exo et non majo',
    'Dont non exo et majo',
    'Détails des majo non exo',
    'Solde heures',
    'Dont diff mois précédent',
    'Compteur',
    'Heures sup à payer',
    'Heures comp à payer',
    'Mutuelle',
    'Transport',
    'Autres frais',
    'Prime',
    'Indemnité',
  ];
  const pays = [
    {
      auxiliary: {
        _id: ObjectID(),
        identity: { firstname: 'Tata', lastname: 'Toto', title: 'mrs' },
        sector: { name: 'Test' },
        contracts: [{ startDate: '2019-05-04T00:00:00' }],
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endDate: '2019-05-31T20:00:00.000Z',
      contractHours: 77.94,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      surchargedAndNotExemptDetails: 'details 1',
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndExemptDetails: 'details 2',
      hoursBalance: -77.94,
      hoursCounter: -77.94,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 37.6,
      otherFees: 18,
      bonus: 0,
      _id: new ObjectID(),
      diff: {
        hoursBalance: 8,
        notSurchargedAndNotExempt: 2,
        notSurchargedAndExempt: 2,
        surchargedAndExempt: 2,
        surchargedAndExemptDetails: [],
        surchargedAndNotExempt: 2,
        surchargedAndNotExemptDetails: [],
        workedHours: 0,
      },
      hoursToWork: 30,
      month: '01-2019',
    },
    {
      auxiliary: {
        _id: ObjectID(),
        identity: { firstname: 'Titi', lastname: 'Tutu' },
        sector: { name: 'Autre test' },
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endDate: '2019-05-31T20:00:00.000Z',
      contractHours: 97.94,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      surchargedAndNotExemptDetails: 'details 3',
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndExemptDetails: 'details 4',
      hoursBalance: -97.94,
      hoursCounter: -97.94,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 47.6,
      otherFees: 20,
      bonus: 100,
      diff: {
        hoursBalance: 8,
        notSurchargedAndNotExempt: 2,
        notSurchargedAndExempt: 2,
        surchargedAndExempt: 2,
        surchargedAndExemptDetails: [],
        surchargedAndNotExempt: 2,
        surchargedAndNotExemptDetails: [],
        workedHours: 0,
      },
      hoursToWork: 20,
    },
  ];
  const finalPays = [
    {
      auxiliary: {
        _id: ObjectID(),
        identity: { firstname: 'Tata', lastname: 'Toto', title: 'mr' },
        sector: { name: 'Test' },
        contracts: [{ startDate: '2019-03-04T00:00:00' }],
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endNotificationDate: '2019-05-31T20:00:00.000Z',
      endReason: 'resignation',
      endDate: '2019-05-31T20:00:00.000Z',
      contractHours: 77.94,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      surchargedAndNotExemptDetails: 'details 1',
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndExemptDetails: 'details 2',
      hoursBalance: -77.94,
      hoursCounter: -77.94,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 37.6,
      otherFees: 18,
      bonus: 0,
      compensation: 156,
      diff: {
        hoursBalance: 8,
        notSurchargedAndNotExempt: 2,
        notSurchargedAndExempt: 2,
        surchargedAndExempt: 2,
        surchargedAndExemptDetails: [],
        surchargedAndNotExempt: 2,
        surchargedAndNotExemptDetails: [],
        workedHours: 0,
      },
      hoursToWork: 20,
    },
    {
      auxiliary: {
        _id: ObjectID(),
        identity: { firstname: 'Titi', lastname: 'Tutu' },
        sector: { name: 'Autre test' },
        contracts: [{ startDate: '2019-03-04T00:00:00' }, { startDate: '2019-01-19T00:00:00' }],
      },
      startDate: '2019-05-01T00:00:00.000Z',
      endNotificationDate: '2019-05-31T20:00:00.000Z',
      endReason: 'mutation',
      endDate: '2019-05-31T20:00:00.000Z',
      contractHours: 97.94,
      workedHours: 0,
      notSurchargedAndNotExempt: 0,
      surchargedAndNotExempt: 0,
      surchargedAndNotExemptDetails: 'details 3',
      notSurchargedAndExempt: 0,
      surchargedAndExempt: 0,
      surchargedAndExemptDetails: 'details 4',
      hoursBalance: -97.94,
      hoursCounter: -97.94,
      overtimeHours: 0,
      additionalHours: 0,
      mutual: true,
      transport: 47.6,
      otherFees: 20,
      bonus: 100,
      compensation: 0,
      diff: {
        hoursBalance: 8,
        notSurchargedAndNotExempt: 2,
        notSurchargedAndExempt: 2,
        surchargedAndExempt: 2,
        surchargedAndExemptDetails: [],
        surchargedAndNotExempt: 2,
        surchargedAndNotExemptDetails: [],
        workedHours: 0,
      },
      hoursToWork: 20,
    },
  ];
  let PayMock;
  let FinalPayMock;
  let formatFloatForExportStub;
  let formatSurchargedDetailsForExport;
  beforeEach(() => {
    PayMock = sinon.mock(Pay);
    FinalPayMock = sinon.mock(FinalPay);
    formatFloatForExportStub = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatSurchargedDetailsForExport = sinon.stub(ExportHelper, 'formatSurchargedDetailsForExport');
  });
  afterEach(() => {
    PayMock.restore();
    FinalPayMock.restore();
    formatFloatForExportStub.restore();
    formatSurchargedDetailsForExport.restore();
  });

  it('should return an array containing just the header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const startDate = '2019-11-10';
    const endDate = '2019-12-10';
    const query = {
      endDate: { $lte: moment(endDate).endOf('M').toDate() },
      startDate: { $gte: moment(startDate).startOf('M').toDate() },
      company: credentials.company._id,
    };
    PayMock.expects('find')
      .withExactArgs(query)
      .chain('sort')
      .withExactArgs({ startDate: 'desc' })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity sector contracts',
        populate: [
          { path: 'sector', select: '_id sector', match: { company: credentials.company._id } },
          { path: 'contracts' },
        ],
      })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns([]);
    FinalPayMock.expects('find')
      .withExactArgs(query)
      .chain('sort')
      .withExactArgs({ startDate: 'desc' })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity sector contracts',
        populate: [
          { path: 'sector', select: '_id sector', match: { company: credentials.company._id } },
          { path: 'contracts' },
        ],
      })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns([]);

    const exportArray = await ExportHelper.exportPayAndFinalPayHistory(startDate, endDate, credentials);

    expect(exportArray).toEqual([header]);
    PayMock.verify();
    FinalPayMock.verify();
  });

  it('should return an array with the header and 2 rows', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const startDate = '2019-11-10';
    const endDate = '2019-12-10';
    const query = {
      endDate: { $lte: moment(endDate).endOf('M').toDate() },
      startDate: { $gte: moment(startDate).startOf('M').toDate() },
      company: credentials.company._id,
    };
    PayMock.expects('find')
      .withExactArgs(query)
      .chain('sort')
      .withExactArgs({ startDate: 'desc' })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity sector contracts',
        populate: [
          { path: 'sector', select: '_id sector', match: { company: credentials.company._id } },
          { path: 'contracts' },
        ],
      })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns(pays);
    FinalPayMock.expects('find')
      .withExactArgs(query)
      .chain('sort')
      .withExactArgs({ startDate: 'desc' })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity sector contracts',
        populate: [
          { path: 'sector', select: '_id sector', match: { company: credentials.company._id } },
          { path: 'contracts' },
        ],
      })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .returns(finalPays);
    formatFloatForExportStub.callsFake(nb => Number(nb).toFixed(2).replace('.', ','));
    formatSurchargedDetailsForExport.returnsArg(1);

    const exportArray = await ExportHelper.exportPayAndFinalPayHistory(startDate, endDate, credentials);

    expect(exportArray).toEqual([
      header,
      [
        expect.any(ObjectID),
        'Mme',
        'Tata',
        'TOTO',
        'Test',
        '04/05/2019',
        '01/05/2019',
        '',
        '',
        '31/05/2019',
        '77,94',
        '30,00',
        '0,00',
        '2,00',
        '2,00',
        'surchargedAndExemptDetails',
        '2,00',
        '2,00',
        'surchargedAndNotExemptDetails',
        '-69,94',
        '8,00',
        '-77,94',
        '0,00',
        '0,00',
        'Oui',
        '37,60',
        '18,00',
        '0,00',
        '0,00',
      ],
      [
        expect.any(ObjectID),
        '',
        'Titi',
        'TUTU',
        'Autre test',
        '',
        '01/05/2019',
        '',
        '',
        '31/05/2019',
        '97,94',
        '20,00',
        '0,00',
        '2,00',
        '2,00',
        'surchargedAndExemptDetails',
        '2,00',
        '2,00',
        'surchargedAndNotExemptDetails',
        '-89,94',
        '8,00',
        '-97,94',
        '0,00',
        '0,00',
        'Oui',
        '47,60',
        '20,00',
        '100,00',
        '0,00',
      ],
      [
        expect.any(ObjectID),
        'M.',
        'Tata',
        'TOTO',
        'Test',
        '04/03/2019',
        '01/05/2019',
        '31/05/2019',
        'Démission',
        '31/05/2019',
        '77,94',
        '20,00',
        '0,00',
        '2,00',
        '2,00',
        'surchargedAndExemptDetails',
        '2,00',
        '2,00',
        'surchargedAndNotExemptDetails',
        '-69,94',
        '8,00',
        '-77,94',
        '0,00',
        '0,00',
        'Oui',
        '37,60',
        '18,00',
        '0,00',
        '156,00',
      ],
      [
        expect.any(ObjectID),
        '',
        'Titi',
        'TUTU',
        'Autre test',
        '19/01/2019',
        '01/05/2019',
        '31/05/2019',
        'Mutation',
        '31/05/2019',
        '97,94',
        '20,00',
        '0,00',
        '2,00',
        '2,00',
        'surchargedAndExemptDetails',
        '2,00',
        '2,00',
        'surchargedAndNotExemptDetails',
        '-89,94',
        '8,00',
        '-97,94',
        '0,00',
        '0,00',
        'Oui',
        '47,60',
        '20,00',
        '100,00',
        '0,00',
      ],
    ]);
    sinon.assert.callCount(formatFloatForExportStub, 61);
    PayMock.verify();
    FinalPayMock.verify();
  });
});

describe('exportPaymentsHistory', () => {
  const header = [
    'Nature',
    'Identifiant',
    'Date',
    'Id Bénéficiaire',
    'Titre',
    'Nom',
    'Prénom',
    'Id tiers payeur',
    'Tiers payeur',
    'Moyen de paiement',
    'Montant TTC en €',
  ];
  const paymentsList = [
    {
      number: 'REG-101051900562',
      type: 'bank_transfer',
      nature: 'payment',
      date: '2019-05-20T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a4fb00997363eb3'),
        identity: {
          title: 'mrs',
          firstname: 'Mimi',
          lastname: 'Mathy',
        },
      },
      thirdPartyPayer: { _id: ObjectID('5c35b5eb7e0fb87297363eb2'), name: 'TF1' },
      netInclTaxes: 389276.023,
    }, {
      number: 'REG-101051900342',
      type: 'direct_debit',
      nature: 'refund',
      date: '2019-05-22T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a6fb02397363eb1'),
        identity: {
          title: 'mr',
          firstname: 'Bojack',
          lastname: 'Horseman',
        },
      },
      thirdPartyPayer: { _id: ObjectID('5c35b5eb1a6fb87297363eb2'), name: 'The Sherif' },
      netInclTaxes: 1002.4,
    },
  ];
  let mockPayment;

  beforeEach(() => {
    mockPayment = sinon.mock(Payment);
  });

  afterEach(() => {
    mockPayment.restore();
  });

  it('should return an array containing just the header', async () => {
    mockPayment.expects('find')
      .chain('sort')
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity' })
      .chain('populate')
      .withExactArgs({ path: 'thirdPartyPayer' })
      .chain('lean')
      .once()
      .returns([]);
    const credentials = { company: new ObjectID() };
    const exportArray = await ExportHelper.exportPaymentsHistory(null, null, credentials);

    expect(exportArray).toEqual([header]);
  });

  it('should return an array with the header and 2 rows', async () => {
    mockPayment.expects('find')
      .chain('sort')
      .chain('populate')
      .withExactArgs({ path: 'customer', select: 'identity' })
      .chain('populate')
      .withExactArgs({ path: 'thirdPartyPayer' })
      .chain('lean')
      .once()
      .returns(paymentsList);
    const credentials = { company: new ObjectID() };
    const exportArray = await ExportHelper.exportPaymentsHistory(null, null, credentials);

    expect(exportArray).toEqual([
      header,
      [
        'Paiement',
        'REG-101051900562',
        '20/05/2019',
        '5c35b5eb1a4fb00997363eb3',
        'Mme',
        'MATHY',
        'Mimi',
        '5c35b5eb7e0fb87297363eb2',
        'TF1',
        'Virement',
        '389276,02',
      ],
      [
        'Remboursement',
        'REG-101051900342',
        '22/05/2019',
        '5c35b5eb1a6fb02397363eb1',
        'M.',
        'HORSEMAN',
        'Bojack',
        '5c35b5eb1a6fb87297363eb2',
        'The Sherif',
        'Prélèvement',
        '1002,40',
      ],
    ]);
  });
});
