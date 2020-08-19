const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
require('sinon-mongoose');
const Customer = require('../../../src/models/Customer');
const User = require('../../../src/models/User');
const SectorHistory = require('../../../src/models/SectorHistory');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const Role = require('../../../src/models/Role');
const Service = require('../../../src/models/Service');
const ExportHelper = require('../../../src/helpers/dataExport');
const UtilsHelper = require('../../../src/helpers/utils');
const { FIXED, HOURLY } = require('../../../src/helpers/constants');
const ContractRepository = require('../../../src/repositories/ContractRepository');
const CustomerRepository = require('../../../src/repositories/CustomerRepository');

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
    expect(result[0]).toMatchObject([
      'Titre',
      'Nom',
      'Prenom',
      'Date de naissance',
      'Adresse',
      '1ère intervention',
      'Auxiliaire référent',
      'Situation',
      'Environnement',
      'Objectifs',
      'Autres',
      'Nom associé au compte bancaire',
      'IBAN',
      'BIC',
      'RUM',
      'Date de signature du mandat',
      'Nombre de souscriptions',
      'Souscriptions',
      'Nombre de financements',
      'Date de création',
      'Statut',
    ]);
    CustomerModel.verify();
  });

  it('should return customer info', async () => {
    const customers = [
      {
        email: 'papi@mamie.pp',
        identity: {
          lastname: 'Papi',
          firstname: 'Grand Père',
          title: 'mr',
          birthDate: '1919-12-12T00:00:00.000+00:00',
        },
        contact: { primaryAddress: { fullAddress: '9 rue du paradis 70015 Paris' } },
        followUp: { situation: 'home', misc: 'Lala', objectives: 'Savate et charentaises', environment: 'Père Castor' },
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
      },
    ];
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
      'Domicile',
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
    expect(result[1]).toMatchObject([
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '', 'Inactif',
    ]);
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
      .withExactArgs({ name: { $in: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] } })
      .chain('lean')
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [];
    UserModel.expects('find')
      .withExactArgs({ 'role.client': { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('populate')
      .withExactArgs({ path: 'contracts', select: '_id startDate endDate' })
      .chain('populate')
      .withExactArgs({ path: 'establishment', select: 'name', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Équipe', 'Id de l\'auxiliaire', 'Titre', 'Nom', 'Prénom',
      'Date de naissance', 'Pays de naissance', 'Departement de naissance', 'Ville de naissance', 'Nationalité',
      'N° de sécurité sociale', 'Addresse', 'Téléphone', 'Nombre de contracts', 'Établissement',
      'Date de début de contrat prestataire', 'Date de fin de contrat prestataire', 'Date d\'inactivité',
      'Date de création']);
    UserModel.verify();
    RoleModel.verify();
  });

  it('should return auxiliary', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] } })
      .chain('lean')
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      {
        _id: new ObjectID(),
        local: { email: 'aide@sos.io' },
        inactivityDate: '2019-02-01T09:38:18.653Z',
        createdAt: '2019-02-01T09:38:18.653Z',
        sector: { name: 'La ruche' },
        identity: {
          title: 'mr',
          firstname: 'Super',
          lastname: 'Mario',
          birthDate: '1994-02-07T09:38:18.653Z',
          birthCountry: 'FR',
          birthState: 78,
          birthCity: 'Paris',
          nationality: 'FR',
          socialSecurityNumber: '295037778923832',
        },
        contracts: [{ _id: 1, startDate: '2019-12-02' }],
        contact: { address: { fullAddress: 'Ponthieu' }, phone: '0123456789' },
        establishment: { name: 'Test' },
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ 'role.client': { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('populate')
      .withExactArgs({ path: 'contracts', select: '_id startDate endDate' })
      .chain('populate')
      .withExactArgs({ path: 'establishment', select: 'name', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      'aide@sos.io',
      'La ruche',
      auxiliaries[0]._id,
      'M.',
      'MARIO',
      'Super',
      '07/02/1994',
      'France',
      78,
      'Paris',
      'Française',
      '295037778923832',
      'Ponthieu',
      '0123456789',
      1,
      'Test',
      '02/12/2019',
      '',
      '01/02/2019',
      '01/02/2019',
    ]);
    UserModel.verify();
    RoleModel.verify();
  });

  it('should return auxiliary with 2 contracts', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] } })
      .chain('lean')
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      {
        _id: new ObjectID(),
        contracts: [
          { _id: 1, startDate: '2019-11-10', endDate: '2019-12-01' },
          { _id: 1, startDate: '2019-12-02' },
        ],
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ 'role.client': { $in: roleIds }, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id sector', match: { company: credentials.company._id } })
      .chain('populate')
      .withExactArgs({ path: 'contracts', select: '_id startDate endDate' })
      .chain('populate')
      .withExactArgs({ path: 'establishment', select: 'name', match: { company: credentials.company._id } })
      .chain('lean')
      .withExactArgs({ autopopulate: true, virtuals: true })
      .once()
      .returns(auxiliaries);

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[2]).toBeDefined();
    expect(result[1]).toMatchObject([
      '', '', auxiliaries[0]._id, '', '', '', '', '', '', '', '', '', '', '', 2, '', '10/11/2019', '01/12/2019', '', '',
    ]);
    expect(result[2]).toMatchObject([
      '', '', auxiliaries[0]._id, '', '', '', '', '', '', '', '', '', '', '', 2, '', '02/12/2019', '', '', '',
    ]);
    UserModel.verify();
    RoleModel.verify();
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
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).chain('lean').returns({ _id: roleId });

    const helpers = [];
    UserModel.expects('find')
      .withExactArgs({ 'role.client': roleId, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({
        path: 'customers',
        populate: { path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } },
      })
      .chain('lean')
      .once()
      .returns(helpers);

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Email',
      'Téléphone',
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
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).chain('lean').returns({ _id: roleId });

    const helpers = [{
      local: { email: 'aide@sos.io' },
      contact: { phone: '0123456789' },
      identity: { lastname: 'Je', firstname: 'suis' },
      createdAt: '2019-02-01T09:38:18.653Z',
    }];
    UserModel.expects('find')
      .withExactArgs({ 'role.client': roleId, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({
        path: 'customers',
        populate: { path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } },
      })
      .chain('lean')
      .once()
      .returns(helpers);

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(
      ['aide@sos.io', '+33123456789', 'JE', 'suis', '', '', '', '', '', '', 'Inactif', '01/02/2019']
    );
  });

  it('should return customer helper info', async () => {
    const roleId = new ObjectID();
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).chain('lean').returns({ _id: roleId });

    const helpers = [{
      customers: [{
        firstIntervention: { startDate: '2019-05-20T06:00:00.000+00:00' },
        identity: { title: 'mr', lastname: 'Patate' },
        local: { phone: '' },
        contact: {
          primaryAddress: {
            fullAddress: '37 rue de Ponthieu 75008 Paris',
            street: '37 rue de Ponthieu',
            zipCode: '75008',
            city: 'Paris',
          },
        },
      }],
    }];
    UserModel.expects('find')
      .withExactArgs({ 'role.client': roleId, company: credentials.company._id })
      .chain('populate')
      .withExactArgs({
        path: 'customers',
        populate: { path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } },
      })
      .chain('lean')
      .once()
      .returns(helpers);

    const result = await ExportHelper.exportHelpers(credentials);

    UserModel.verify();
    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      '',
      '',
      '',
      '',
      'M.',
      'PATATE',
      '',
      '37 rue de Ponthieu',
      '75008',
      'Paris',
      'Actif',
      '',
    ]);
  });
});

describe('exportSectors', () => {
  let SectorHistoryModel;
  beforeEach(() => {
    SectorHistoryModel = sinon.mock(SectorHistory);
  });

  afterEach(() => {
    SectorHistoryModel.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    SectorHistoryModel.expects('find')
      .withExactArgs({ company: credentials.company._id, startDate: { $exists: true } })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id name' })
      .chain('populate')
      .withExactArgs({ path: 'auxiliary', select: '_id identity.firstname identity.lastname' })
      .chain('lean')
      .returns([]);

    const result = await ExportHelper.exportSectors(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Equipe',
      'Id de l\'auxiliaire',
      'Nom',
      'Prénom',
      'Date d\'arrivée dans l\'équipe',
      'Date de départ de l\'équipe',
    ]);
    SectorHistoryModel.verify();
  });

  it('should return sector info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const sectorHistories = [{
      sector: { name: 'test' },
      auxiliary: {
        _id: new ObjectID(),
        identity: { firstname: 'toto', lastname: 'Tutu' },
      },
      startDate: '2019-11-10',
    },
    {
      sector: { name: 'test2' },
      auxiliary: {
        _id: new ObjectID(),
        identity: { firstname: 'toto2', lastname: 'Tutu2' },
      },
      startDate: '2019-11-10',
      endDate: '2019-12-10',
    }];
    SectorHistoryModel.expects('find')
      .withExactArgs({ company: credentials.company._id, startDate: { $exists: true } })
      .chain('populate')
      .withExactArgs({ path: 'sector', select: '_id name' })
      .chain('populate')
      .withExactArgs({ path: 'auxiliary', select: '_id identity.firstname identity.lastname' })
      .chain('lean')
      .returns(sectorHistories);

    const result = await ExportHelper.exportSectors(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toMatchObject([
      'test',
      sectorHistories[0].auxiliary._id,
      'Tutu',
      'toto',
      '10/11/2019',
      '',
    ]);
    expect(result[2]).toMatchObject([
      'test2',
      sectorHistories[1].auxiliary._id,
      'Tutu2',
      'toto2',
      '10/11/2019',
      '10/12/2019',
    ]);
    SectorHistoryModel.verify();
  });
});

describe('exportReferents', () => {
  let ReferentHistoryModel;
  beforeEach(() => {
    ReferentHistoryModel = sinon.mock(ReferentHistory);
  });

  afterEach(() => {
    ReferentHistoryModel.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    ReferentHistoryModel.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .withExactArgs('auxiliary')
      .chain('populate')
      .withExactArgs('customer')
      .chain('lean')
      .returns([]);

    const result = await ExportHelper.exportReferents(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Bénéficiaire - Titre',
      'Bénéficiaire - Nom',
      'Bénéficiaire - Prénom',
      'Auxiliaire - Titre',
      'Auxiliaire - Nom',
      'Auxiliaire - Prénom',
      'Date de début',
      'Date de fin',
    ]);
    ReferentHistoryModel.verify();
  });

  it('should return referent info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const referentHistories = [
      {
        auxiliary: { identity: { firstname: 'toto', title: 'mr' } },
        customer: { identity: { firstname: 'titi', lastname: 'Tata', title: 'mr' } },
        startDate: '2019-11-10',
        endDate: '2020-01-21',
      },
      {
        auxiliary: { identity: { firstname: 'toto', lastname: 'Tutu' } },
        customer: { identity: { lastname: 'Tata', title: 'mr' } },
        startDate: '2020-11-10',
      },
    ];
    ReferentHistoryModel.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .withExactArgs('auxiliary')
      .chain('populate')
      .withExactArgs('customer')
      .chain('lean')
      .returns(referentHistories);

    const result = await ExportHelper.exportReferents(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toMatchObject([
      'M.',
      'TATA',
      'titi',
      'M.',
      '',
      'toto',
      '10/11/2019',
      '21/01/2020',
    ]);
    expect(result[2]).toMatchObject([
      'M.',
      'TATA',
      '',
      '',
      'TUTU',
      'toto',
      '10/11/2020',
      '',
    ]);
    ReferentHistoryModel.verify();
  });
});

describe('exportStaffRegister', () => {
  let getStaffRegister;
  beforeEach(() => {
    getStaffRegister = sinon.stub(ContractRepository, 'getStaffRegister');
  });

  afterEach(() => {
    getStaffRegister.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    getStaffRegister.returns([]);

    const result = await ExportHelper.exportStaffRegister(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Nom',
      'Prénom',
      'Civilité',
      'Date de naissance',
      'Nationalité',
      'Emploi',
      'Type de contrat',
      'Date de début',
      'Date de fin',
    ]);
    sinon.assert.calledWithExactly(getStaffRegister, credentials.company._id);
  });

  it('should return staff registerg info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const staffRegister = [{
      user: {
        _id: new ObjectID(),
        identity: {
          firstname: 'toto',
          lastname: 'Tutu',
          title: 'mr',
          birthDate: '1976-09-12T00:00:00',
          nationality: 'FR',
        },
      },
      startDate: '2019-11-10T00:00:00',
    },
    {
      user: {
        _id: new ObjectID(),
        identity: {
          firstname: 'toto2',
          lastname: 'Tutu2',
          title: 'mrs',
          birthDate: '1989-10-12T00:00:00',
          nationality: 'AF',
        },
      },
      startDate: '2019-11-10T00:00:00',
      endDate: '2019-12-10T00:00:00',
    }];
    getStaffRegister.returns(staffRegister);

    const result = await ExportHelper.exportStaffRegister(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toMatchObject([
      'TUTU',
      'toto',
      'M.',
      '12/09/1976',
      'Française',
      'Auxiliaire de vie',
      'CDI',
      '10/11/2019',
      '',
    ]);
    expect(result[2]).toMatchObject([
      'TUTU2',
      'toto2',
      'Mme',
      '12/10/1989',
      'Afghane',
      'Auxiliaire de vie',
      'CDI',
      '10/11/2019',
      '10/12/2019',
    ]);
    sinon.assert.calledWithExactly(getStaffRegister, credentials.company._id);
  });
});

describe('exportServices', () => {
  let ServiceModel;
  let getLastVersion;
  let formatFloatForExport;
  beforeEach(() => {
    ServiceModel = sinon.mock(Service);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExport.callsFake(float => (float != null ? `F-${float}` : ''));
  });
  afterEach(() => {
    ServiceModel.restore();
    getLastVersion.restore();
    formatFloatForExport.restore();
  });

  it('should return csv header', async () => {
    const services = [];
    const credentials = { company: { _id: new ObjectID() } };
    ServiceModel.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .chain('populate')
      .once()
      .returns(services);

    const result = await ExportHelper.exportServices(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Nature',
      'Entreprise',
      'Nom',
      'Montant unitaire par défaut',
      'TVA (%)',
      'Plan de majoration',
      'Date de début',
      'Date de création',
      'Date de mise a jour',
    ]);
  });

  it('should list services', async () => {
    const services = [
      {
        nature: HOURLY,
        company: { name: 'Alenvi' },
        versions: [
          { name: 'lifté', defaultUnitAmount: 12, vat: 10, startDate: '2019-02-08T09:38:18.653Z' },
          { name: 'lifté', defaultUnitAmount: 12, vat: 10, startDate: '2019-02-011T09:38:18.653Z' },
        ],
        updatedAt: '2019-02-14T09:38:18.653Z',
        createdAt: '2019-01-21T09:38:18.653Z',
      },
      {
        nature: FIXED,
        company: { name: 'Compani' },
        versions: [{
          name: 'kické',
          vat: 5.5,
          defaultUnitAmount: 13,
          surcharge: { name: 'smatch' },
          startDate: '2019-02-01T09:38:18.653Z',
        }],
        updatedAt: '2019-02-14T09:38:18.653Z',
        createdAt: '2019-01-21T09:38:18.653Z',
      },
    ];
    const credentials = { company: { _id: new ObjectID() } };
    ServiceModel.expects('find')
      .withExactArgs({ company: credentials.company._id })
      .chain('populate')
      .chain('populate')
      .once()
      .returns(services);

    const result = await ExportHelper.exportServices(credentials);

    sinon.assert.calledTwice(getLastVersion);
    sinon.assert.callCount(formatFloatForExport, 4);
    expect(result).toBeDefined();
    expect(result.length).toEqual(services.length + 1);
    expect(result[1]).toMatchObject([
      'Horaire', 'Alenvi', 'lifté', 'F-12', 'F-10', '', '08/02/2019', '21/01/2019', '14/02/2019',
    ]);
    expect(result[2]).toMatchObject([
      'Forfaitaire', 'Compani', 'kické', 'F-13', 'F-5.5', 'smatch', '01/02/2019', '21/01/2019', '14/02/2019',
    ]);
  });
});

describe('exportSubscriptions', () => {
  let CustomerModel;
  let getLastVersion;
  let formatFloatForExport;
  beforeEach(() => {
    CustomerModel = sinon.mock(Customer);
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExport.callsFake(float => `F-${float || ''}`);
  });

  afterEach(() => {
    CustomerModel.restore();
    getLastVersion.restore();
    formatFloatForExport.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportSubscriptions(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Titre',
      'Nom',
      'Prénom',
      'Service',
      'Prix unitaire TTC',
      'Volume hebdomadaire estimatif',
      'Dont soirées',
      'Dont dimanches',
    ]);
  });

  it('should return subscriptions info', async () => {
    const customers = [
      {
        identity: { lastname: 'Autonomie', title: 'mr' },
        subscriptions: [{
          service: { versions: [{ name: 'Service' }] },
          versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 4, sundays: 2, evenings: 9 }],
        }],
      },
    ];
    const companyId = new ObjectID();
    CustomerModel.expects('find')
      .withExactArgs({ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId })
      .chain('populate')
      .chain('lean')
      .once()
      .returns(customers);

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportSubscriptions(credentials);

    sinon.assert.calledTwice(getLastVersion);
    sinon.assert.calledTwice(formatFloatForExport);
    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['M.', 'AUTONOMIE', '', 'Service', 'F-12', 'F-4', 9, 2]);
  });
});

describe('exportFundings', () => {
  let getCustomerFundings;
  let getLastVersion;
  let formatFloatForExport;
  let mergeLastVersionWithBaseObject;
  const credentials = { company: { _id: new ObjectID() } };

  beforeEach(() => {
    getCustomerFundings = sinon.stub(CustomerRepository, 'getCustomerFundings');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    mergeLastVersionWithBaseObject = sinon.stub(UtilsHelper, 'mergeLastVersionWithBaseObject');
    formatFloatForExport.callsFake(float => (float != null ? `F-${float}` : ''));
    mergeLastVersionWithBaseObject.returnsArg(0);
  });

  afterEach(() => {
    getCustomerFundings.restore();
    formatFloatForExport.restore();
    getLastVersion.restore();
    mergeLastVersionWithBaseObject.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    getCustomerFundings.returns(customers);

    const result = await ExportHelper.exportFundings(credentials);

    sinon.assert.notCalled(getLastVersion);
    sinon.assert.notCalled(formatFloatForExport);
    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Titre',
      'Nom',
      'Prénom',
      'Tiers payeur',
      'Nature',
      'Service',
      'Date de début',
      'Date de fin',
      'Numéro de dossier',
      'Fréquence',
      'Montant TTC',
      'Montant unitaire TTC',
      'Nombre d\'heures',
      'Jours',
      'Participation du bénéficiaire',
    ]);
  });

  it('should return funding info', async () => {
    const customers = [
      {
        identity: { lastname: 'Autonomie', title: 'mr' },
        funding: {
          thirdPartyPayer: { name: 'tpp' },
          subscription: { service: { versions: [{ name: 'Toto' }] } },
          nature: 'fixed',
          frequency: 'once',
          startDate: '2018-07-15T00:00:00.000+00:00',
          endDate: '2018-07-15T00:00:00.000+00:00',
          folderNumber: 'Toto',
          amountTTC: 12,
          unitTTCRate: 14,
          careHours: 3,
          careDays: [1, 4, 5],
          customerParticipationRate: 90,
        },
      },
    ];

    getCustomerFundings.returns(customers);

    const result = await ExportHelper.exportFundings(credentials);

    sinon.assert.calledOnce(mergeLastVersionWithBaseObject);
    sinon.assert.callCount(formatFloatForExport, 4);
    sinon.assert.calledOnce(getLastVersion);
    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      'M.',
      'AUTONOMIE',
      '',
      'tpp',
      'Forfaitaire',
      'Toto',
      '15/07/2018',
      '15/07/2018',
      'Toto',
      'Une seule fois',
      'F-12',
      'F-14',
      'F-3',
      'Mardi Vendredi Samedi',
      'F-90',
    ]);
  });
});
