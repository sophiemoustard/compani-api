const { ObjectID } = require('mongodb');
const expect = require('expect');
const sinon = require('sinon');
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
const SinonMongoose = require('../sinonMongoose');

describe('exportCustomers', () => {
  let findCustomer;
  let getLastVersion;
  beforeEach(() => {
    findCustomer = sinon.stub(Customer, 'find');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(versions => versions[0]);
  });

  afterEach(() => {
    findCustomer.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    const companyId = new ObjectID();

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportCustomers(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Id Bénéficiaire',
      'Titre',
      'Nom',
      'Prenom',
      'Date de naissance',
      'Adresse',
      '1ère intervention',
      'Id Auxiliaire référent',
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
    ]);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: companyId } }],
        },
        { query: 'populate', args: [{ path: 'referent', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should return customer info', async () => {
    const customers = [
      {
        _id: new ObjectID(),
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
        referent: { _id: new ObjectID(), identity: { firstname: 'Toto', lastname: 'Test' } },
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

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportCustomers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      expect.any(ObjectID),
      'M.',
      'PAPI',
      'Grand Père',
      '12/12/1919',
      '9 rue du paradis 70015 Paris',
      '08/08/2019',
      expect.any(ObjectID),
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
    ]);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: companyId } }],
        },
        { query: 'populate', args: [{ path: 'referent', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });

  it('should return empty strings if missing data', async () => {
    const customers = [{}];
    const companyId = new ObjectID();

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportCustomers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 0, '', 0, '',
    ]);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        {
          query: 'populate',
          args: [{ path: 'firstIntervention', select: 'startDate', match: { company: companyId } }],
        },
        { query: 'populate', args: [{ path: 'referent', match: { company: companyId } }] },
        { query: 'lean', args: [{ autopopulate: true }] },
      ]
    );
  });
});

describe('exportAuxiliaries', () => {
  let findUser;
  let findRole;
  let getLastVersion;
  beforeEach(() => {
    findUser = sinon.stub(User, 'find');
    findRole = sinon.stub(Role, 'find');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    findUser.restore();
    findRole.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    const auxiliaries = [];

    findRole.returns(SinonMongoose.stubChainedQueries([[{ _id: roleIds[0] }, { _id: roleIds[1] }]], ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries([auxiliaries]));

    const result = await ExportHelper.exportAuxiliaries(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Équipe', 'Id Auxiliaire', 'Titre', 'Nom', 'Prénom',
      'Date de naissance', 'Pays de naissance', 'Departement de naissance', 'Ville de naissance', 'Nationalité',
      'N° de sécurité sociale', 'Addresse', 'Téléphone', 'Nombre de contracts', 'Établissement',
      'Date de début de contrat prestataire', 'Date de fin de contrat prestataire', 'Date d\'inactivité',
      'Date de création']);
    SinonMongoose.calledWithExactly(
      findRole,
      [
        { query: 'find', args: [{ name: { $in: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] } }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      findUser,
      [
        { query: 'find', args: [{ 'role.client': { $in: roleIds }, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: '_id startDate endDate' }] },
        {
          query: 'populate',
          args: [{ path: 'establishment', select: 'name', match: { company: credentials.company._id } }],
        },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should return auxiliary', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
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

    findRole.returns(SinonMongoose.stubChainedQueries([[{ _id: roleIds[0] }, { _id: roleIds[1] }]], ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries([auxiliaries]));

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
    SinonMongoose.calledWithExactly(
      findRole,
      [
        { query: 'find', args: [{ name: { $in: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] } }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      findUser,
      [
        { query: 'find', args: [{ 'role.client': { $in: roleIds }, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: '_id startDate endDate' }] },
        {
          query: 'populate',
          args: [{ path: 'establishment', select: 'name', match: { company: credentials.company._id } }],
        },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });

  it('should return auxiliary with 2 contracts', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleIds = [new ObjectID(), new ObjectID()];
    const auxiliaries = [
      {
        _id: new ObjectID(),
        contracts: [{ _id: 1, startDate: '2019-11-10', endDate: '2019-12-01' }, { _id: 1, startDate: '2019-12-02' }],
      },
    ];

    findRole.returns(SinonMongoose.stubChainedQueries([[{ _id: roleIds[0] }, { _id: roleIds[1] }]], ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries([auxiliaries]));

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
    SinonMongoose.calledWithExactly(
      findRole,
      [
        { query: 'find', args: [{ name: { $in: ['auxiliary', 'planning_referent', 'auxiliary_without_company'] } }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      findUser,
      [
        { query: 'find', args: [{ 'role.client': { $in: roleIds }, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{ path: 'sector', select: '_id sector', match: { company: credentials.company._id } }],
        },
        { query: 'populate', args: [{ path: 'contracts', select: '_id startDate endDate' }] },
        {
          query: 'populate',
          args: [{ path: 'establishment', select: 'name', match: { company: credentials.company._id } }],
        },
        { query: 'lean', args: [{ autopopulate: true, virtuals: true }] },
      ]
    );
  });
});

describe('exportHelpers', () => {
  let findUser;
  let findOneRole;
  let getLastVersion;

  beforeEach(() => {
    findUser = sinon.stub(User, 'find');
    findOneRole = sinon.stub(Role, 'findOne');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').returns(this[0]);
  });

  afterEach(() => {
    findUser.restore();
    findOneRole.restore();
    getLastVersion.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleId = new ObjectID();
    const helpers = [];

    findOneRole.returns(SinonMongoose.stubChainedQueries([{ _id: roleId }], ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries([helpers]));

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Email',
      'Téléphone',
      'Id Aidant',
      'Aidant - Nom',
      'Aidant - Prénom',
      'Id Bénéficiaire',
      'Bénéficiaire - Titre',
      'Bénéficiaire - Nom',
      'Bénéficiaire - Prénom',
      'Bénéficiaire - Rue',
      'Bénéficiaire - Code postal',
      'Bénéficiaire - Ville',
      'Date de création',
    ]);
    SinonMongoose.calledWithExactly(findOneRole, [{ query: 'findOne', args: [{ name: 'helper' }] }, { query: 'lean' }]);
    SinonMongoose.calledWithExactly(
      findUser,
      [
        { query: 'find', args: [{ 'role.client': roleId, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            populate: {
              path: 'customer',
              select: 'identity contact',
              populate: { path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } },
            },
            match: { company: credentials.company._id },
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return helper info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleId = new ObjectID();
    const helpers = [{
      _id: new ObjectID(),
      local: { email: 'aide@sos.io' },
      contact: { phone: '0123456789' },
      identity: { lastname: 'Je', firstname: 'suis' },
      createdAt: '2019-02-01T09:38:18.653Z',
    }];

    findOneRole.returns(SinonMongoose.stubChainedQueries([{ _id: roleId }], ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries([helpers]));

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(
      [
        'aide@sos.io',
        '+33123456789',
        expect.any(ObjectID),
        'JE',
        'suis',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '01/02/2019',
      ]
    );
    SinonMongoose.calledWithExactly(findOneRole, [{ query: 'findOne', args: [{ name: 'helper' }] }, { query: 'lean' }]);
    SinonMongoose.calledWithExactly(
      findUser,
      [
        { query: 'find', args: [{ 'role.client': roleId, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            populate: {
              path: 'customer',
              select: 'identity contact',
              populate: { path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } },
            },
            match: { company: credentials.company._id },
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return customer helper info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const roleId = new ObjectID();
    const helpers = [{
      customers: {
        customer: {
          _id: new ObjectID(),
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
        },
      },
    }];

    findOneRole.returns(SinonMongoose.stubChainedQueries([{ _id: roleId }], ['lean']));
    findUser.returns(SinonMongoose.stubChainedQueries([helpers]));

    const result = await ExportHelper.exportHelpers(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([
      '',
      '',
      '',
      '',
      '',
      expect.any(ObjectID),
      'M.',
      'PATATE',
      '',
      '37 rue de Ponthieu',
      '75008',
      'Paris',
      '',
    ]);
    SinonMongoose.calledWithExactly(findOneRole, [{ query: 'findOne', args: [{ name: 'helper' }] }, { query: 'lean' }]);
    SinonMongoose.calledWithExactly(
      findUser,
      [
        { query: 'find', args: [{ 'role.client': roleId, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{
            path: 'customers',
            populate: {
              path: 'customer',
              select: 'identity contact',
              populate: { path: 'firstIntervention', select: 'startDate', match: { company: credentials.company._id } },
            },
            match: { company: credentials.company._id },
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportSectors', () => {
  let findSectorHistory;
  beforeEach(() => {
    findSectorHistory = sinon.stub(SectorHistory, 'find');
  });

  afterEach(() => {
    findSectorHistory.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };

    findSectorHistory.returns(SinonMongoose.stubChainedQueries([[]]));

    const result = await ExportHelper.exportSectors(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Equipe',
      'Id Auxiliaire',
      'Nom',
      'Prénom',
      'Date d\'arrivée dans l\'équipe',
      'Date de départ de l\'équipe',
    ]);
    SinonMongoose.calledWithExactly(
      findSectorHistory,
      [
        { query: 'find', args: [{ company: credentials.company._id, startDate: { $exists: true } }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id name' }] },
        { query: 'populate', args: [{ path: 'auxiliary', select: '_id identity.firstname identity.lastname' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return sector info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const sectorHistories = [{
      sector: { name: 'test' },
      auxiliary: { _id: new ObjectID(), identity: { firstname: 'toto', lastname: 'Tutu' } },
      startDate: '2019-11-10',
    },
    {
      sector: { name: 'test2' },
      auxiliary: { _id: new ObjectID(), identity: { firstname: 'toto2', lastname: 'Tutu2' } },
      startDate: '2019-11-10',
      endDate: '2019-12-10',
    }];

    findSectorHistory.returns(SinonMongoose.stubChainedQueries([sectorHistories]));

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
    SinonMongoose.calledWithExactly(
      findSectorHistory,
      [
        { query: 'find', args: [{ company: credentials.company._id, startDate: { $exists: true } }] },
        { query: 'populate', args: [{ path: 'sector', select: '_id name' }] },
        { query: 'populate', args: [{ path: 'auxiliary', select: '_id identity.firstname identity.lastname' }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportReferents', () => {
  let findReferentHistory;
  beforeEach(() => {
    findReferentHistory = sinon.stub(ReferentHistory, 'find');
  });

  afterEach(() => {
    findReferentHistory.restore();
  });

  it('should return csv header', async () => {
    const credentials = { company: { _id: new ObjectID() } };

    findReferentHistory.returns(SinonMongoose.stubChainedQueries([[]]));

    const result = await ExportHelper.exportReferents(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Id Bénéficiaire',
      'Bénéficiaire - Titre',
      'Bénéficiaire - Nom',
      'Bénéficiaire - Prénom',
      'Id Auxiliaire',
      'Auxiliaire - Titre',
      'Auxiliaire - Nom',
      'Auxiliaire - Prénom',
      'Date de début',
      'Date de fin',
    ]);
    SinonMongoose.calledWithExactly(
      findReferentHistory,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        { query: 'populate', args: ['auxiliary'] },
        { query: 'populate', args: ['customer'] },
        { query: 'lean' },
      ]
    );
  });

  it('should return referent info', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const referentHistories = [
      {
        auxiliary: { _id: new ObjectID(), identity: { firstname: 'toto', title: 'mr' } },
        customer: { _id: new ObjectID(), identity: { firstname: 'titi', lastname: 'Tata', title: 'mr' } },
        startDate: '2019-11-10',
        endDate: '2020-01-21',
      },
      {
        _id: new ObjectID(),
        auxiliary: { _id: new ObjectID(), identity: { firstname: 'toto', lastname: 'Tutu' } },
        customer: { _id: new ObjectID(), identity: { lastname: 'Tata', title: 'mr' } },
        startDate: '2020-11-10',
      },
    ];

    findReferentHistory.returns(SinonMongoose.stubChainedQueries([referentHistories]));

    const result = await ExportHelper.exportReferents(credentials);

    expect(result).toBeDefined();
    expect(result[1]).toMatchObject([
      expect.any(ObjectID),
      'M.',
      'TATA',
      'titi',
      expect.any(ObjectID),
      'M.',
      '',
      'toto',
      '10/11/2019',
      '21/01/2020',
    ]);
    expect(result[2]).toMatchObject([
      expect.any(ObjectID),
      'M.',
      'TATA',
      '',
      expect.any(ObjectID),
      '',
      'TUTU',
      'toto',
      '10/11/2020',
      '',
    ]);
    SinonMongoose.calledWithExactly(
      findReferentHistory,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        { query: 'populate', args: ['auxiliary'] },
        { query: 'populate', args: ['customer'] },
        { query: 'lean' },
      ]
    );
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
      'Id Auxiliaire',
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
      expect.any(ObjectID),
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
      expect.any(ObjectID),
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
  let findService;
  let getLastVersion;
  let formatFloatForExport;
  beforeEach(() => {
    findService = sinon.stub(Service, 'find');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExport.callsFake(float => (float != null ? `F-${float}` : ''));
  });
  afterEach(() => {
    findService.restore();
    getLastVersion.restore();
    formatFloatForExport.restore();
  });

  it('should return csv header', async () => {
    const services = [];
    const credentials = { company: { _id: new ObjectID() } };

    findService.returns(SinonMongoose.stubChainedQueries([services]));

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
    SinonMongoose.calledWithExactly(
      findService,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        { query: 'populate', args: ['company'] },
        { query: 'populate', args: [{ path: 'versions.surcharge', match: { company: credentials.company._id } }] },
        { query: 'lean' },
      ]
    );
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

    findService.returns(SinonMongoose.stubChainedQueries([services]));

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
    SinonMongoose.calledWithExactly(
      findService,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        { query: 'populate', args: ['company'] },
        { query: 'populate', args: [{ path: 'versions.surcharge', match: { company: credentials.company._id } }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('exportSubscriptions', () => {
  let findCustomer;
  let getLastVersion;
  let formatFloatForExport;
  beforeEach(() => {
    findCustomer = sinon.stub(Customer, 'find');
    getLastVersion = sinon.stub(UtilsHelper, 'getLastVersion').callsFake(v => v[0]);
    formatFloatForExport = sinon.stub(UtilsHelper, 'formatFloatForExport');
    formatFloatForExport.callsFake(float => `F-${float || ''}`);
  });

  afterEach(() => {
    findCustomer.restore();
    getLastVersion.restore();
    formatFloatForExport.restore();
  });

  it('should return csv header', async () => {
    const customers = [];
    const companyId = new ObjectID();

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportSubscriptions(credentials);

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject([
      'Id Bénéficiaire',
      'Titre',
      'Nom',
      'Prénom',
      'Service',
      'Prix unitaire TTC',
      'Volume hebdomadaire estimatif',
      'Dont soirées',
      'Dont dimanches',
    ]);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return subscriptions info', async () => {
    const customers = [
      {
        _id: new ObjectID(),
        identity: { lastname: 'Autonomie', title: 'mr' },
        subscriptions: [{
          service: { versions: [{ name: 'Service' }] },
          versions: [{ unitTTCRate: 12, estimatedWeeklyVolume: 4, sundays: 2, evenings: 9 }],
        }],
      },
    ];
    const companyId = new ObjectID();

    findCustomer.returns(SinonMongoose.stubChainedQueries([customers]));

    const credentials = { company: { _id: companyId } };
    const result = await ExportHelper.exportSubscriptions(credentials);

    sinon.assert.calledTwice(getLastVersion);
    sinon.assert.calledTwice(formatFloatForExport);
    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject([expect.any(ObjectID), 'M.', 'AUTONOMIE', '', 'Service', 'F-12', 'F-4', 9, 2]);
    SinonMongoose.calledWithExactly(
      findCustomer,
      [
        { query: 'find', args: [{ subscriptions: { $exists: true, $not: { $size: 0 } }, company: companyId }] },
        { query: 'populate', args: [{ path: 'subscriptions.service' }] },
        { query: 'lean' },
      ]
    );
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
      'Id Bénéficiaire',
      'Titre',
      'Nom',
      'Prénom',
      'Id tiers payeur',
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
        _id: new ObjectID(),
        identity: { lastname: 'Autonomie', title: 'mr' },
        funding: {
          thirdPartyPayer: { _id: new ObjectID(), name: 'tpp' },
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
      expect.any(ObjectID),
      'M.',
      'AUTONOMIE',
      '',
      expect.any(ObjectID),
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
