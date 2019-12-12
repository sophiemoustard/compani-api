const { ObjectID } = require('mongodb');
const moment = require('moment');
const expect = require('expect');
const sinon = require('sinon');
require('sinon-mongoose');
const Customer = require('../../../src/models/Customer');
const Bill = require('../../../src/models/Bill');
const CreditNote = require('../../../src/models/CreditNote');
const Contract = require('../../../src/models/Contract');
const User = require('../../../src/models/User');
const Role = require('../../../src/models/Role');
const Pay = require('../../../src/models/Pay');
const FinalPay = require('../../../src/models/FinalPay');
const ExportHelper = require('../../../src/helpers/export');
const UtilsHelper = require('../../../src/helpers/utils');
const EventRepository = require('../../../src/repositories/EventRepository');

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
          title: 'mrs',
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
        condition: 'invoiced_and_not_paid',
        reason: 'auxiliary_initiative',
      },
      isBilled: false,
      type: 'internalHour',
      internalHour: { name: 'Formation' },
      repetition: { frequency: 'never' },
      sector: { name: 'Etoiles - 75' },
      customer: {
        identity: {
          title: 'mr',
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
      ['Heure interne', 'Formation', '', '20/05/2019 08:00', '20/05/2019 10:00', '2,00', '', 'Etoiles - 75', '', '', '', 'Oui', 'M.', 'HORSEMAN', 'Bojack', 'brbr', 'Non', 'Oui', 'Facturée & non payée', 'Initiative du de l\'intervenant'],
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
      ['Absence injustifiée', 'Horaire', '20/05/2019 08:00', '20/05/2019 10:00', 'Girafes - 75', '', 'Jean-Claude', 'VAN DAMME', ''],
      ['Congé', 'Journalière', '20/05/2019', '20/05/2019', 'Etoiles - 75', '', 'Princess', 'CAROLYN', 'brbr'],
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
    'Services',
    'Date de création',
  ];
  const bills = [
    {
      number: 'FACT-0549236',
      date: '2019-05-20T06:00:00.000+00:00',
      customer: {
        _id: ObjectID('5c35b5eb1a4fb00997363eb3'),
        identity: {
          title: 'mrs',
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
      createdAt: '2019-10-11',
    }, {
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
      createdAt: '2019-10-15',
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
    mockBill
      .expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('client')
      .chain('lean')
      .returns([]);
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
      .returns([]);

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null, credentials);

    expect(exportArray).toEqual([header]);
    mockBill.verify();
    mockCreditNote.verify();
  });

  it('should return an array with the header and a row of empty cells', async () => {
    mockBill
      .expects('find')
      .withExactArgs(findQuery)
      .chain('sort')
      .withExactArgs(sortQuery)
      .chain('populate')
      .withExactArgs(populateCustomerQuery)
      .chain('populate')
      .withExactArgs('client')
      .chain('lean')
      .returns([{}]);
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
      .returns([{}]);
    formatPriceStub.callsFake(price => (price ? `P-${price}` : ''));
    formatFloatForExportStub.callsFake(float => (float ? `F-${float}` : ''));

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null, credentials);

    expect(exportArray).toEqual([
      header,
      ['Facture', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['Avoir', '', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
    mockBill.verify();
    mockCreditNote.verify();
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
      .withExactArgs('client')
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
    formatFloatForExportStub.callsFake(float => (float ? `F-${float}` : ''));

    const exportArray = await ExportHelper.exportBillsAndCreditNotesHistory(null, null, credentials);

    sinon.assert.callCount(formatPriceStub, 3);
    sinon.assert.callCount(formatFloatForExportStub, 8);
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
        'Temps de qualité - autonomie - 20 heures - P-410686.201944 TTC',
        '11/10/2019'],
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
        'Forfait nuit - 15 heures - P-738.521944 TTC\r\nForfait nuit - 7 heures - P-302 TTC',
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
        'Temps de qualité - autonomie',
        '16/10/2019',
      ],
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
    const credentials = { company: { _id: '1234567890' } };
    contractMock.expects('find')
      .withExactArgs({ company: '1234567890', 'versions.startDate': { $lte: endDate, $gte: startDate } })
      .chain('populate')
      .chain('lean')
      .once()
      .returns([]);

    const result = await ExportHelper.exportContractHistory(startDate, endDate, credentials);
    contractMock.verify();
    expect(result).toEqual([['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire']]);
  });

  it('should return an array containing the header and one row', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const contracts = [{ versions: [{ startDate: '2019-10-10T00:00:00' }] }];
    contractMock.expects('find')
      .withExactArgs({ company: '1234567890', 'versions.startDate': { $lte: endDate, $gte: startDate } })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(contracts);

    const result = await ExportHelper.exportContractHistory(startDate, endDate, credentials);
    contractMock.verify();
    expect(result).toEqual([
      ['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', '', '', '', '10/10/2019', '', '', ''],
    ]);
  });

  it('should return an array with the header and 2 rows', async () => {
    const credentials = { company: { _id: '1234567890' } };
    const contracts = [
      {
        user: { identity: { title: 'mr', lastname: 'Patate' } },
        versions: [
          { startDate: '2019-10-10T00:00:00', weeklyHours: 12, grossHourlyRate: 10.45 },
        ],
      },
      {
        user: { identity: { title: 'mrs', firstname: 'Patate' } },
        versions: [
          { startDate: '2019-09-08T00:00:00', endDate: '2019-10-07T00:00:00', weeklyHours: 10, grossHourlyRate: 10 },
          { startDate: '2019-10-08T00:00:00', endDate: '2019-11-07T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
          { startDate: '2019-11-08T00:00:00', weeklyHours: 14, grossHourlyRate: 2 },
        ],
      },
    ];

    contractMock.expects('find')
      .withExactArgs({ company: '1234567890', 'versions.startDate': { $lte: endDate, $gte: startDate } })
      .chain('populate')
      .chain('lean')
      .returns(contracts);

    const result = await ExportHelper.exportContractHistory(startDate, endDate, credentials);
    expect(result).toEqual([
      ['Type', 'Titre', 'Prénom', 'Nom', 'Date de début', 'Date de fin', 'Taux horaire', 'Volume horaire hebdomadaire'],
      ['Contrat', 'M.', '', 'Patate', '10/10/2019', '', '10,45', 12],
      ['Avenant', 'Mme', 'Patate', '', '08/10/2019', '07/11/2019', '2,00', 14],
    ]);
    contractMock.verify();
  });
});

describe('exportCustomers', () => {
  let CustomerModel;
  let getLastVersion;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(versions => versions[0]);
  });

  afterEach(() => {
    CustomerModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ company: companyId })
      .chain('populate')
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportCustomers(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Titre', 'Nom', 'Prenom', 'Date de naissance', 'Adresse',
      '1ère intervention', 'Auxiliaire référent', 'Environnement', 'Objectifs', 'Autres',
      'Nom associé au compte bancaire', 'IBAN', 'BIC', 'RUM', 'Date de signature du mandat', 'Nombre de souscriptions',
      'Souscriptions', 'Nombre de financements', 'Date de création', 'Statut']);
    CustomerModel.verify();
  });

  it('should return customer info', async () => {
    const customers = [{
      email: 'papi@mamie.pp',
      identity: { lastname: 'Papi', firstname: 'Grand Père', title: 'mr', birthDate: '1919-12-12T00:00:00.000+00:00' },
      contact: { primaryAddress: { fullAddress: '9 rue du paradis 70015 Paris' } },
      followUp: { misc: 'Lala', objectives: 'Savate et charentaises', environment: 'Père Castor' },
      firstIntervention: { _id: new ObjectID(), startDate: '2019-08-08T10:00:00' },
      referent: {
        identity: {
          firstname: 'Toto',
          lastname: 'Test',
        },
      },
      payment: {
        bankAccountOwner: 'Lui',
        iban: 'Boom Ba Da Boom',
        bic: 'bic bic',
        mandates: [{ rum: 'Grippe et rhume', signedAt: '2012-12-12T00:00:00.000+00:00' }],
      },
      subscriptions: [
        { service: { versions: [{ name: 'Au service de sa majesté' }] } },
        { service: { versions: [{ name: 'Service public' }] } },
        { service: { versions: [{ name: 'Service civique' }] } },
      ],
      fundings: [{ _id: 'toto' }, { _id: 'lala' }],
      createdAt: '2012-12-12T00:00:00.000+00:00',
    }];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ company: companyId })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);
    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportCustomers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      'M.',
      'PAPI',
      'Grand Père',
      '12/12/1919',
      '9 rue du paradis 70015 Paris',
      '08/08/2019',
      'Toto Test',
      'Père Castor',
      'Savate et charentaises',
      'Lala',
      'Lui',
      'Boom Ba Da Boom',
      'bic bic',
      'Grippe et rhume',
      '12/12/2012',
      3,
      'Au service de sa majesté\r\n Service public\r\n Service civique',
      2,
      '12/12/2012',
      'Actif',
    ]);
    CustomerModel.verify();
  });

  it('should return empty strings if missing data', async () => {
    const customers = [{}];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ company: companyId })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportCustomers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '', 'Inactif']);
    CustomerModel.verify();
  });
});

describe('exportAuxiliaries', () => {
  let UserModel;
  let RoleModel;
  let getLastVersion;
  beforeEach(() => {
    UserModel = sinon.mock(User);
    RoleModel = sinon.mock(Role);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    UserModel.restore();
    RoleModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs('sector')
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Équipe', 'Titre', 'Nom', 'Prénom', 'Date de naissance', 'Pays de naissance',
      'Departement de naissance', 'Ville de naissance', 'Nationalité', 'N° de sécurité sociale', 'Addresse', 'Téléphone',
      'Nombre de contracts', 'Date d\'inactivité', 'Date de création']);
  });

  it('should return auxiliary info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      {
        local: { email: 'aide@sos.io' },
        contact: { phone: '0123456789' },
        inactivityDate: '2019-02-01T09:38:18.653Z',
        createdAt: '2019-02-01T09:38:18.653Z',
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs('sector')
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['aide@sos.io', '', '', '', '', '', '', '', '', '', '', '', '0123456789', 0, '01/02/2019', '01/02/2019']);
  });

  it('should return auxiliary sector', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      { sector: { name: 'La ruche' } },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs('sector')
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'La ruche', '', '', '', '', '', '', '', '', '', '', '', 0, '', '']);
  });

  it('should return auxiliary identity', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      {
        identity: {
          title: 'mr',
          firstname: 'Super',
          lastname: 'Mario',
          birthDate: '1994-02-07T09:38:18.653Z',
          birthCountry: 'FR',
          birthState: 78,
          birthCity: 'Paris',
          nationality: 'FR',
          socialSecurityNumber: '0987654321',
        },
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs('sector')
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', 'M.', 'MARIO', 'Super', '07/02/1994', 'France', 78, 'Paris', 'Française', '0987654321', '', '', 0, '', '']);
  });

  it('should return auxiliary contracts count', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      { contracts: [{ _id: 1 }, { _id: 2 }] },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs('sector')
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', 2, '', '']);
  });

  it('should return auxiliary address', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      { contact: { address: { fullAddress: 'La ruche' } } },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs('sector')
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', 'La ruche', '', 0, '', '']);
  });
});

describe('exportHelpers', () => {
  let UserModel;
  let RoleModel;
  let getLastVersion;
  const credentials = { company: { _id: new ObjectID() } };
  beforeEach(() => {
    UserModel = sinon.mock(User);
    RoleModel = sinon.mock(Role);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    UserModel.restore();
    RoleModel.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const roleId = new ObjectID();
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).returns({ _id: roleId });

    const helpers = [];
    UserModel.expects('find')
      .withExactArgs({ role: roleId, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({
        path: 'customers',
        populate: { path: 'firstIntervention', select: 'startDate' },
      })
      .once()
      .returns(helpers);

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Email',
      'Aidant - Nom',
      'Aidant - Prénom',
      'Bénéficiaire - Titre',
      'Bénéficiaire - Nom',
      'Bénéficiaire - Prénom',
      'Bénéficiaire - Rue',
      'Bénéficiaire - Code postal',
      'Bénéficiaire - Ville',
      'Bénéficiaire - Statut',
      'Date de création',
    ]);

    UserModel.verify();
  });

  it('should return helper info', async () => {
    const roleId = new ObjectID();
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).returns({ _id: roleId });

    const helpers = [
      {
        local: { email: 'aide@sos.io' },
        identity: { lastname: 'Je', firstname: 'suis' },
        createdAt: '2019-02-01T09:38:18.653Z',
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: roleId, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({
        path: 'customers',
        populate: { path: 'firstIntervention', select: 'startDate' },
      })
      .once()
      .returns(helpers);

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['aide@sos.io', 'JE', 'suis', '', '', '', '', '', '', 'Inactif', '01/02/2019']);
  });

  it('should return customer helper info', async () => {
    const roleId = new ObjectID();
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).returns({ _id: roleId });

    const helpers = [
      {
        customers: [{
          firstIntervention: { startDate: '2019-05-20T06:00:00.000+00:00' },
          identity: { title: 'mr', lastname: 'Patate' },
          contact: {
            primaryAddress: {
              fullAddress: '37 rue de Ponthieu 75008 Paris',
              street: '37 rue de Ponthieu',
              zipCode: '75008',
              city: 'Paris',
            },
          },
        }],
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: roleId, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({
        path: 'customers',
        populate: { path: 'firstIntervention', select: 'startDate' },
      })
      .once()
      .returns(helpers);

    const result = await ExportHelper.exportHelpers(credentials);

    UserModel.verify();
    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', 'M.', 'PATATE', '', '37 rue de Ponthieu', '75008', 'Paris', 'Actif', '']);
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
    PayMock.expects('find').never();
    FinalPayMock.expects('find').never();

    const exportArray = await ExportHelper.exportPayAndFinalPayHistory(null, null, credentials);

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
        populate: [{ path: 'sector', select: 'name' }, { path: 'contracts' }],
      })
      .chain('lean')
      .once()
      .returns(pays);
    FinalPayMock.expects('find')
      .withExactArgs(query)
      .chain('sort')
      .withExactArgs({ startDate: 'desc' })
      .chain('populate')
      .withExactArgs({
        path: 'auxiliary',
        select: 'identity sector contracts',
        populate: [{ path: 'sector', select: 'name' }, { path: 'contracts' }],
      })
      .chain('lean')
      .once()
      .returns(finalPays);
    formatFloatForExportStub.callsFake(nb => Number(nb).toFixed(2).replace('.', ','));
    formatSurchargedDetailsForExport.returnsArg(1);

    const exportArray = await ExportHelper.exportPayAndFinalPayHistory(startDate, endDate, credentials);

    expect(exportArray).toEqual([
      header,
      ['Mme', 'Tata', 'TOTO', 'Test', '04/05/2019', '01/05/2019', '', '', '31/05/2019', '77,94', '30,00', '0,00', '2,00', '2,00', 'surchargedAndExemptDetails', '2,00', '2,00', 'surchargedAndNotExemptDetails', '-69,94', '8,00', '-77,94', '0,00', '0,00', 'Oui', '37,60', '18,00', '0,00', '0,00'],
      ['', 'Titi', 'TUTU', 'Autre test', '', '01/05/2019', '', '', '31/05/2019', '97,94', '20,00', '0,00', '2,00', '2,00', 'surchargedAndExemptDetails', '2,00', '2,00', 'surchargedAndNotExemptDetails', '-89,94', '8,00', '-97,94', '0,00', '0,00', 'Oui', '47,60', '20,00', '100,00', '0,00'],
      ['M.', 'Tata', 'TOTO', 'Test', '04/03/2019', '01/05/2019', '31/05/2019', 'Démission', '31/05/2019', '77,94', '20,00', '0,00', '2,00', '2,00', 'surchargedAndExemptDetails', '2,00', '2,00', 'surchargedAndNotExemptDetails', '-69,94', '8,00', '-77,94', '0,00', '0,00', 'Oui', '37,60', '18,00', '0,00', '156,00'],
      ['', 'Titi', 'TUTU', 'Autre test', '19/01/2019', '01/05/2019', '31/05/2019', 'Mutation', '31/05/2019', '97,94', '20,00', '0,00', '2,00', '2,00', 'surchargedAndExemptDetails', '2,00', '2,00', 'surchargedAndNotExemptDetails', '-89,94', '8,00', '-97,94', '0,00', '0,00', 'Oui', '47,60', '20,00', '100,00', '0,00'],
    ]);
    sinon.assert.callCount(formatFloatForExportStub, 61);
    PayMock.verify();
    FinalPayMock.verify();
  });
});
