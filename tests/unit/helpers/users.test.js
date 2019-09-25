const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const UtilsHelper = require('../../../src/helpers/utils');
const UsersHelper = require('../../../src/helpers/users');
const User = require('../../../src/models/User');
const Role = require('../../../src/models/Role');

require('sinon-mongoose');

describe('exportHelpers', () => {
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
    const roleId = new ObjectID();
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).returns({ _id: roleId });

    const helpers = [];
    UserModel.expects('find')
      .withExactArgs({ role: roleId })
      .chain('populate')
      .once()
      .returns(helpers);

    const result = await UsersHelper.exportHelpers();

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Aidant - Nom', 'Aidant - Prénom', 'Bénéficiaire - Titre', 'Bénéficiaire - Nom', 'Bénéficiaire - Prénom', 'Date de création']);
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
      .withExactArgs({ role: roleId })
      .chain('populate')
      .once()
      .returns(helpers);

    const result = await UsersHelper.exportHelpers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['aide@sos.io', 'JE', 'suis', '', '', '', '01/02/2019']);
  });

  it('should return customer helper info', async () => {
    const roleId = new ObjectID();
    RoleModel.expects('findOne').withExactArgs({ name: 'helper' }).returns({ _id: roleId });

    const helpers = [
      {
        customers: [{ identity: { title: 'M', lastname: 'Patate' } }],
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: roleId })
      .chain('populate')
      .once()
      .returns(helpers);

    const result = await UsersHelper.exportHelpers();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', 'M', 'PATATE', '', '']);
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
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds } })
      .chain('populate')
      .once()
      .returns(auxiliaries);

    const result = await UsersHelper.exportAuxiliaries();

    expect(result).toBeDefined();
    expect(result[0]).toMatchObject(['Email', 'Équipe', 'Titre', 'Nom', 'Prénom', 'Date de naissance', 'Pays de naissance',
      'Departement de naissance', 'Ville de naissance', 'Nationalité', 'N° de sécurité sociale', 'Addresse', 'Téléphone',
      'Nombre de contracts', 'Date d\'inactivité', 'Date de création']);
  });

  it('should return auxiliary info', async () => {
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      {
        local: { email: 'aide@sos.io' },
        mobilePhone: '0123456789',
        inactivityDate: '2019-02-01T09:38:18.653Z',
        createdAt: '2019-02-01T09:38:18.653Z',
      },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds } })
      .chain('populate')
      .once()
      .returns(auxiliaries);

    const result = await UsersHelper.exportAuxiliaries();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['aide@sos.io', '', '', '', '', '', '', '', '', '', '', '', '0123456789', 0, '01/02/2019', '01/02/2019']);
  });

  it('should return auxiliary sector', async () => {
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      { sector: { name: 'La ruche' } },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds } })
      .chain('populate')
      .once()
      .returns(auxiliaries);

    const result = await UsersHelper.exportAuxiliaries();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', 'La ruche', '', '', '', '', '', '', '', '', '', '', '', 0, '', '']);
  });

  it('should return auxiliary identity', async () => {
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      {
        identity: {
          title: 'M',
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
      .withExactArgs({ role: { $in: roleIds } })
      .chain('populate')
      .once()
      .returns(auxiliaries);

    const result = await UsersHelper.exportAuxiliaries();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', 'M', 'MARIO', 'Super', '07/02/1994', 'France', 78, 'Paris', 'Française', '0987654321', '', '', 0, '', '']);
  });

  it('should return auxiliary contracts count', async () => {
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      { contracts: [{ _id: 1 }, { _id: 2 }] },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds } })
      .chain('populate')
      .once()
      .returns(auxiliaries);

    const result = await UsersHelper.exportAuxiliaries();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', '', '', 2, '', '']);
  });

  it('should return auxiliary address', async () => {
    const roleIds = [new ObjectID(), new ObjectID()];
    RoleModel.expects('find')
      .withExactArgs({ name: { $in: ['auxiliary', 'planningReferent'] } })
      .returns([{ _id: roleIds[0] }, { _id: roleIds[1] }]);

    const auxiliaries = [
      { contact: { address: { fullAddress: 'La ruche' } } },
    ];
    UserModel.expects('find')
      .withExactArgs({ role: { $in: roleIds } })
      .chain('populate')
      .once()
      .returns(auxiliaries);

    const result = await UsersHelper.exportAuxiliaries();

    expect(result).toBeDefined();
    expect(result[1]).toBeDefined();
    expect(result[1]).toMatchObject(['', '', '', '', '', '', '', '', '', '', '', 'La ruche', '', 0, '', '']);
  });
});
