const expect = require('expect');
const sinon = require('sinon');
const { ObjectID } = require('mongodb');
const UtilsHelper = require('../../../helpers/utils');
const UsersHelper = require('../../../helpers/users');
const User = require('../../../models/User');
const Role = require('../../../models/Role');

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
    expect(result[0]).toMatchObject(['Email', 'Nom', 'Prénom', 'Beneficiaire', 'Date de création']);
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
    expect(result[1]).toMatchObject(['aide@sos.io', 'Je', 'suis', '', '01/02/2019']);
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
    expect(result[1]).toMatchObject(['', '', '', 'M Patate', '']);
  });
});
